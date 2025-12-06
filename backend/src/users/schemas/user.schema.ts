import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  name?: string;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
  })
  location?: {
    latitude: number;
    longitude: number;
  };

  @Prop()
  country?: string;

  @Prop()
  state?: string;

  @Prop()
  city?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
// Índice removido - o decorator @Prop({ unique: true }) já cria o índice automaticamente
