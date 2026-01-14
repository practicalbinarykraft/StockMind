export class CreateUserError extends Error {
    constructor() {
        super('Failed to create user')
    }
}

export class InvalidEmailOrPasswordError extends Error {
    constructor() {
        super('Invalid email or password')
    }
}