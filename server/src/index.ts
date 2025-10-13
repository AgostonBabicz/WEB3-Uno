import http from 'http'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { execute, subscribe } from 'graphql'
import { WebSocketServer } from 'ws'
import { getOperationAST, parse } from 'graphql'
import { resolvers, typeDefs } from './graphql'

async function bootstrap() {
  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const app = express()
  app.use(cors())
  app.use(bodyParser.json())
  const httpServer = http.createServer(app)

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' })

  wsServer.on('connection', (socket) => {
    let acknowledged = false
    const subs = new Map<string, AsyncIterator<any>>()

    function send(obj: any) {
      try {
        socket.send(JSON.stringify(obj))
      } catch {}
    }

    async function startSubscription(
      id: string,
      payload: { query: string; variables?: any; operationName?: string },
    ) {
      let document
      try {
        document = parse(payload.query)
      } catch (err: any) {
        send({ type: 'error', id, payload: { message: err.message || String(err) } })
        send({ type: 'complete', id })
        return
      }

      const op = getOperationAST(document, payload.operationName)?.operation
      const execArgs = {
        schema,
        document,
        variableValues: payload.variables,
        operationName: payload.operationName,
        contextValue: {},
      }

      try {
        if (op === 'subscription') {
          const iter = (await subscribe(execArgs)) as AsyncIterable<any> | any

          if (!(iter && typeof (iter as any)[Symbol.asyncIterator] === 'function')) {
            send({ type: 'next', id, payload: iter })
            send({ type: 'complete', id })
            return
          }

          const it = iter as AsyncIterator<any>
          subs.set(id, it)
          ;(async () => {
            try {
              for await (const result of it as unknown as AsyncIterable<any>) {
                send({ type: 'next', id, payload: result })
              }
            } catch (e: any) {
              send({ type: 'error', id, payload: { message: e?.message || String(e) } })
            } finally {
              send({ type: 'complete', id })
              const cur = subs.get(id)
              if (cur && typeof cur.return === 'function') {
                try {
                  await cur.return(undefined)
                } catch {}
              }
              subs.delete(id)
            }
          })()
        } else {
          // query/mutation over WS
          const result = await execute(execArgs)
          send({ type: 'next', id, payload: result })
          send({ type: 'complete', id })
        }
      } catch (e: any) {
        send({ type: 'error', id, payload: { message: e?.message || String(e) } })
        send({ type: 'complete', id })
      }
    }

    socket.on('message', async (raw) => {
      let msg: any
      try {
        msg = JSON.parse(String(raw))
      } catch {
        send({ type: 'error', payload: { message: 'Bad JSON' } })
        return
      }

      switch (msg.type) {
        case 'connection_init': {
          acknowledged = true
          send({ type: 'connection_ack' })
          return
        }
        case 'ping': {
          send({ type: 'pong', payload: msg.payload })
          return
        }
        case 'subscribe': {
          if (!acknowledged) {
            send({ type: 'error', id: msg.id, payload: { message: 'connection_init required' } })
            return
          }
          if (!msg.id) {
            send({ type: 'error', payload: { message: 'Missing id' } })
            return
          }
          startSubscription(msg.id, msg.payload)
          return
        }
        case 'complete': {
          if (msg.id && subs.has(msg.id)) {
            const it = subs.get(msg.id)!
            try {
              if (typeof it.return === 'function') await it.return(undefined)
            } catch {}
            subs.delete(msg.id)
          }
          return
        }
        default: {
          send({ type: 'error', payload: { message: `Unknown message type: ${msg.type}` } })
          return
        }
      }
    })

    socket.on('close', async () => {
      for (const [, it] of subs) {
        try {
          if (typeof it.return === 'function') await it.return(undefined)
        } catch {}
      }
      subs.clear()
    })
  })

  const apollo = new ApolloServer({ schema })
  await apollo.start()
  app.use('/graphql', expressMiddleware(apollo, { context: async () => ({}) }))

  const PORT = Number(process.env.PORT ?? 4000)
  httpServer.listen(PORT, () => {
    console.log(`HTTP: http://localhost:${PORT}/graphql`)
    console.log(`WS:   ws://localhost:${PORT}/graphql`)
  })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
