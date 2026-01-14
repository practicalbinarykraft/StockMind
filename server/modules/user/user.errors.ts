export class UserAlreadyExistsError extends Error {
    constructor(email: string) {
      super(`User with email ${email} already exists`)
    }
  }

export class UserNotFoundByIdError extends Error {
    constructor(id: string) {
        super(`User with id ${id} not found`)
    }
}

export class UserNotFoundByEmailError extends Error {
    constructor(email: string) {
        super(`User with email ${email} not found`)
    }
}