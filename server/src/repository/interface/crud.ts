export interface CRUD<T> {
  create(input: any): Promise<T>
  getOne(input: any): Promise<T>
  get(): Promise<T[]>
  update(input: any): Promise<T>
  delete(input: any): Promise<void>
}
