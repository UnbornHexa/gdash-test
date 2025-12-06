import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'E-mail deve ser um endereço válido' })
  email?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((o) => o.password !== undefined && o.password !== null && o.password !== '')
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
