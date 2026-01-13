import { z } from 'zod'

export const GetUserDto = z.object({
    id: z.string().uuid(),
})

export const CreateUserDto = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
})

export const CreateUserInDBDto = z.object({
    email: z.string().email(),
    passwordHash: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
})

export type GetUserDto = z.infer<typeof GetUserDto>
export type CreateUserDto = z.infer<typeof CreateUserDto>
export type CreateUserInDBDto = z.infer<typeof CreateUserInDBDto>