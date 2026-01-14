import { comparePassword } from "../../lib/jwt-auth";
import { userService } from "../user/user.service";
import type { RegisterDto, LoginDto } from "./auth.dto";
import { generateToken } from "../../lib/jwt-auth";
import { CreateUserError, InvalidEmailOrPasswordError } from "./auth.errors";


export const authService = {
  async register(dto: RegisterDto) {
    const newUser = await userService.create(dto)
    if (!newUser) {
      throw new CreateUserError();
    }

    const token = generateToken(newUser);
    return { newUser, token }
  },

  
  async login(dto: LoginDto) {
    const user = await userService.getByEmail(dto.email)
    
    if (!user || !user.passwordHash) {
      throw new InvalidEmailOrPasswordError();
    }

    const isValidPassword = await comparePassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new InvalidEmailOrPasswordError();
    }

    const token = generateToken(user);

    return { user, token }
  },
};
