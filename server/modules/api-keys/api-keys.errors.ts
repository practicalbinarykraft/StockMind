export class ApiKeyNotFoundError extends Error {
    constructor() {
        super('API key not found')
    }
}