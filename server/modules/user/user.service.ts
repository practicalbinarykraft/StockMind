import { hashPassword } from "server/lib/jwt-auth";
import { UserRepo } from "./user.repo";
import { CreateUserDto } from "./user.dto";

const userRepo = new UserRepo();

export const userService = {
  async create(dto: CreateUserDto) {
    const exists = await userRepo.findByEmail(dto.email)
    if (exists) {
      throw new Error('User already exists')
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await userRepo.create({...dto, passwordHash})

    return user
  },

  async getById(id: string) {
    const user = await userRepo.getById(id)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  },

  async getByEmail(email: string) {
    const user = await userRepo.findByEmail(email)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }
}