const seconds: number[] = [1, 1.5, 2, 2.5, 3]

// returns a random delay so that bots feel more human, randomized between 1 and 3 seconds for the reaction time
export function randomDelay() {
  const length = seconds.length
  const randIndex = Math.floor(Math.random() * length)
  return seconds[randIndex] * 1000
}
