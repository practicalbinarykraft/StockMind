import { GetUserDto } from "./user.dto"
import { userService } from "./user.service"
import { Request, Response } from "express"

export const userController = {
    async getUser(req: Request, res: Response) {
        const dto = GetUserDto.parse(req.params)

        const user = await userService.getById(dto.id)

        res.status(200).json(user)
    }, // try cath - with error
}