import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Pokemon {
  id: string;
  name: string;
  image?: string;
  types?: string[];
}

interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  baseExperience: number;
  types: Array<{ slot: number; type: { name: string; url: string } }>;
  abilities: Array<{ ability: { name: string }; isHidden: boolean }>;
  stats: Array<{ baseStat: number; stat: { name: string } }>;
  sprites: {
    frontDefault: string;
    backDefault?: string;
    frontShiny?: string;
    backShiny?: string;
  };
}

const Pokemon = () => {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchPokemons();
  }, [page]);

  const fetchPokemons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pokemon', { params: { page, limit } });
      setPokemons(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error('Error fetching Pokémons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPokemonDetail = async (id: string) => {
    try {
      const response = await api.get(`/pokemon/${id}`);
      setSelectedPokemon(response.data);
    } catch (error) {
      console.error('Error fetching Pokémon details:', error);
    }
  };

  if (loading && pokemons.length === 0) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Pokemon Explorer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pokemon List</CardTitle>
              <CardDescription>Page {page} of {totalPages}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pokemons.map((pokemon) => (
                  <Card
                    key={pokemon.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => fetchPokemonDetail(pokemon.id)}
                  >
                    <CardContent className="p-4 text-center">
                      {pokemon.image && (
                        <img
                          src={pokemon.image}
                          alt={pokemon.name}
                          className="w-24 h-24 mx-auto mb-2"
                        />
                      )}
                      <h3 className="font-semibold capitalize">{pokemon.name}</h3>
                      {pokemon.types && (
                        <div className="flex justify-center gap-1 mt-2">
                          {pokemon.types.map((type) => (
                            <span
                              key={type}
                              className="px-2 py-1 text-xs bg-gray-200 rounded capitalize"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedPokemon && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{selectedPokemon.name}</CardTitle>
                <CardDescription>Pokemon #{selectedPokemon.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPokemon.sprites.frontDefault && (
                  <div className="text-center">
                    <img
                      src={selectedPokemon.sprites.frontDefault}
                      alt={selectedPokemon.name}
                      className="w-32 h-32 mx-auto"
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Basic Info</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Height:</span> {selectedPokemon.height / 10}m</p>
                    <p><span className="font-medium">Weight:</span> {selectedPokemon.weight / 10}kg</p>
                    <p><span className="font-medium">Base Experience:</span> {selectedPokemon.baseExperience}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPokemon.types.map((type) => (
                      <span
                        key={type.slot}
                        className="px-2 py-1 text-xs bg-gray-200 rounded capitalize"
                      >
                        {type.type.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Abilities</h3>
                  <div className="space-y-1">
                    {selectedPokemon.abilities.map((ability, index) => (
                      <p key={index} className="text-sm capitalize">
                        {ability.ability.name}
                        {ability.isHidden && <span className="text-gray-500"> (Hidden)</span>}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Base Stats</h3>
                  <div className="space-y-1">
                    {selectedPokemon.stats.map((stat, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="capitalize">{stat.stat.name.replace('-', ' ')}:</span>
                        <span className="font-medium">{stat.baseStat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pokemon;
