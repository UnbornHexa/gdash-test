import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PokemonService {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';

  async findAll(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      const response = await axios.get(`${this.baseUrl}/pokemon`, {
        params: { offset, limit },
      });

      const results = await Promise.all(
        response.data.results.map(async (pokemon: any) => {
          const pokemonId = pokemon.url.split('/').filter(Boolean).pop();
          const details = await this.findOne(pokemonId);
          return {
            id: pokemonId,
            name: pokemon.name,
            url: pokemon.url,
            image: details.sprites?.front_default,
            types: details.types?.map((t: any) => t.type.name),
          };
        }),
      );

      return {
        data: results,
        meta: {
          total: response.data.count,
          page,
          limit,
          totalPages: Math.ceil(response.data.count / limit),
        },
      };
    } catch (error) {
      throw new HttpException('Failed to fetch Pokémons', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/pokemon/${id}`);
      const data = response.data;

      return {
        id: data.id,
        name: data.name,
        height: data.height,
        weight: data.weight,
        baseExperience: data.base_experience,
        types: data.types.map((t: any) => ({
          slot: t.slot,
          type: {
            name: t.type.name,
            url: t.type.url,
          },
        })),
        abilities: data.abilities.map((a: any) => ({
          ability: {
            name: a.ability.name,
            url: a.ability.url,
          },
          isHidden: a.is_hidden,
          slot: a.slot,
        })),
        stats: data.stats.map((s: any) => ({
          baseStat: s.base_stat,
          effort: s.effort,
          stat: {
            name: s.stat.name,
            url: s.stat.url,
          },
        })),
        sprites: {
          frontDefault: data.sprites.front_default,
          backDefault: data.sprites.back_default,
          frontShiny: data.sprites.front_shiny,
          backShiny: data.sprites.back_shiny,
        },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new HttpException('Pokémon not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to fetch Pokémon details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
