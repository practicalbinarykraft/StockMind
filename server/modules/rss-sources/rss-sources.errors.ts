export class RssSourceNotFoundError extends Error {
    constructor() {
        super('RSS source not found')
    }
}