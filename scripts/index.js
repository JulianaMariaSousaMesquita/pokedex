// Configuração da API
const API_BASE_URL = 'https://pokeapi.co/api/v2';
const PAGE_SIZE = 18;

// Estado da aplicação
const state = {
  currentPage: 1,
  totalPages: 0,
  totalCount: 0,
  isLoading: false,
  mode: 'list',
  searchTerm: '',
  searchResults: [],
  cache: {
    pokemonList: null,
    types: {}
  }
};

// Elementos do DOM
let pokemonListElement;
let searchFormElement;
let searchInputElement;
let paginationPagesElement;
let previousButtonElement;
let nextButtonElement;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  pokemonListElement = document.querySelector('[data-pokemon-list]');
  searchFormElement = document.querySelector('.search-form');
  searchInputElement = document.querySelector('[data-search-input]');
  paginationPagesElement = document.querySelector('[data-pagination-pages]');
  previousButtonElement = document.querySelector('[data-page-previous]');
  nextButtonElement = document.querySelector('[data-page-next]');

  // Verificando se os elementos existem
  if (!pokemonListElement || !searchFormElement || !searchInputElement) {
    console.error('Elementos do DOM não encontrados!');
    return;
  }

  attachEventListeners();
  loadPokemonList();
});

function attachEventListeners() {
  // Submit da busca
  searchFormElement.addEventListener('submit', handleSearchSubmit);

  // Limpar busca volta
  searchInputElement.addEventListener('input', () => {
    const trimmed = searchInputElement.value.trim();
    if (trimmed === '' && state.mode === 'search') {
      state.mode = 'list';
      state.searchTerm = '';
      state.currentPage = 1;
      loadPokemonList();
    }
  });

  // Navegação de páginas
  if (previousButtonElement) {
    previousButtonElement.addEventListener('click', () => {
      if (state.currentPage > 1) {
        goToPage(state.currentPage - 1);
      }
    });
  }

  if (nextButtonElement) {
    nextButtonElement.addEventListener('click', () => {
      if (state.currentPage < state.totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
}

/* HANDLERS */

function handleSearchSubmit(event) {
  event.preventDefault();
  const trimmedSearch = searchInputElement.value.trim().toLowerCase();

  if (trimmedSearch.length === 0) {
    state.mode = 'list';
    state.searchTerm = '';
    state.currentPage = 1;
    loadPokemonList();
    return;
  }

  state.mode = 'search';
  state.searchTerm = trimmedSearch;
  searchPokemon(trimmedSearch);
}

/* LISTAGEM PRINCIPAL COM PAGINAÇÃO */

async function loadPokemonList() {
  try {
    setLoading(true);
    pokemonListElement.innerHTML = '';

    const offset = (state.currentPage - 1) * PAGE_SIZE;
    const url = `${API_BASE_URL}/pokemon?limit=${PAGE_SIZE}&offset=${offset}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Erro ao buscar lista de pokémons.');
    }

    const data = await response.json();
    const basicPokemonList = data.results;
    state.totalCount = data.count;
    state.totalPages = Math.ceil(data.count / PAGE_SIZE);

    const detailedPokemonList = await loadPokemonDetails(basicPokemonList);
    renderPokemonList(detailedPokemonList);
    renderPagination();
  } catch (error) {
    console.error('Erro ao carregar pokémons:', error);
    showError('Erro ao carregar pokémons. Tente novamente.');
  } finally {
    setLoading(false);
  }
}

/* BUSCA */

async function searchPokemon(searchTerm) {
  try {
    setLoading(true);
    pokemonListElement.innerHTML = '';

    // Verifica se é um tipo em português
    const typeInEnglish = traduzirTipoParaIngles(searchTerm);
    if (typeInEnglish) {
      await searchPokemonByType(typeInEnglish);
      return;
    }

    // Tenta buscar pelo nome exato
    const response = await fetch(`${API_BASE_URL}/pokemon/${searchTerm}`);

    if (response.ok) {
      const data = await response.json();
      const pokemonData = mapPokemonDetail(data);
      renderPokemonList([pokemonData]);
      if (paginationPagesElement) paginationPagesElement.innerHTML = '';
      if (previousButtonElement) previousButtonElement.disabled = true;
      if (nextButtonElement) nextButtonElement.disabled = true;
      return;
    }

    // Se não encontrou, busca por prefixo
    if (response.status === 404) {
      await searchPokemonByPrefix(searchTerm);
      return;
    }

    throw new Error('Erro ao buscar pokémon.');
  } catch (error) {
    console.error('Erro na busca:', error);
    showError('Pokémon não encontrado. Tente outro nome.');
  } finally {
    setLoading(false);
  }
}

async function searchPokemonByPrefix(prefix) {
  try {
    // Carrega lista completa se não estiver em cache
    if (!state.cache.pokemonList) {
      const response = await fetch(`${API_BASE_URL}/pokemon?limit=2000`);
      if (!response.ok) throw new Error('Erro ao buscar lista.');
      const data = await response.json();
      state.cache.pokemonList = data.results;
    }

    // Filtra pokémons que começam com o prefixo
    const matchingPokemon = state.cache.pokemonList.filter(pokemon =>
      pokemon.name.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (matchingPokemon.length === 0) {
      showError(`Nenhum pokémon encontrado começando com "${prefix}".`);
      return;
    }

    // Configura paginação para resultados
    state.mode = 'search';
    state.currentPage = 1;
    state.searchResults = matchingPokemon;
    state.totalCount = matchingPokemon.length;
    state.totalPages = Math.ceil(matchingPokemon.length / PAGE_SIZE);

    await renderSearchPage();
  } catch (error) {
    console.error('Erro ao buscar por prefixo:', error);
    showError('Erro ao buscar pokémons.');
  }
}

async function searchPokemonByType(typeInEnglish) {
  try {
    // Busca por tipo com cache
    if (!state.cache.types[typeInEnglish]) {
      const response = await fetch(`${API_BASE_URL}/type/${typeInEnglish}`);
      if (!response.ok) throw new Error('Erro ao buscar por tipo.');
      const data = await response.json();
      state.cache.types[typeInEnglish] = data.pokemon.map(entry => ({
        name: entry.pokemon.name,
        url: entry.pokemon.url
      }));
    }

    const allPokemonWithType = state.cache.types[typeInEnglish];

    if (allPokemonWithType.length === 0) {
      showError('Nenhum pokémon encontrado deste tipo.');
      return;
    }

    // Busca detalhes para filtrar apenas tipo primário
    const allDetails = await loadPokemonDetails(allPokemonWithType);
    const primaryTypeOnly = allPokemonWithType.filter((_, index) => {
      const details = allDetails[index];
      return details && details.types && details.types[0] === typeInEnglish;
    });

    if (primaryTypeOnly.length === 0) {
      showError('Nenhum pokémon encontrado com este tipo primário.');
      return;
    }

    // Configura paginação
    state.mode = 'search';
    state.currentPage = 1;
    state.searchResults = primaryTypeOnly;
    state.totalCount = primaryTypeOnly.length;
    state.totalPages = Math.ceil(primaryTypeOnly.length / PAGE_SIZE);

    await renderSearchPage();
  } catch (error) {
    console.error('Erro ao buscar por tipo:', error);
    showError('Erro ao buscar pokémons por tipo.');
  }
}

/* RENDERIZAÇÃO DE PÁGINA DE BUSCA */

async function renderSearchPage() {
  try {
    const startIndex = (state.currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const pageResults = state.searchResults.slice(startIndex, endIndex);

    const detailedPokemonList = await loadPokemonDetails(pageResults);
    renderPokemonList(detailedPokemonList);
    renderPagination();
  } catch (error) {
    console.error('Erro ao renderizar página de busca:', error);
    showError('Erro ao carregar resultados.');
  }
}

/* CARREGAR DETALHES DOS POKÉMONS */

async function loadPokemonDetails(basicPokemonList) {
  const promises = basicPokemonList.map(entry => fetch(entry.url));
  const responses = await Promise.all(promises);

  const successResponses = responses.filter(response => response.ok);
  const jsonPromises = successResponses.map(response => response.json());
  const detailedDataList = await Promise.all(jsonPromises);

  return detailedDataList.map(mapPokemonDetail);
}

function mapPokemonDetail(data) {
  const imageUrl =
    data.sprites.other?.['official-artwork']?.front_default ||
    data.sprites.front_default ||
    '';

  const types = (data.types || []).map(typeEntry => typeEntry.type.name);

  return {
    id: data.id,
    name: data.name,
    imageUrl,
    types
  };
}

/* RENDERIZAÇÃO DOS CARDS */

function renderPokemonList(pokemonList) {
  if (pokemonList.length === 0) {
    pokemonListElement.innerHTML = '<p class="no-results">Nenhum pokémon encontrado.</p>';
    return;
  }

  const cardHtmlList = pokemonList.map(pokemon => {
    const mainType = pokemon.types[0] ?? '';
    const formattedId = String(pokemon.id).padStart(4, '0');
    const typeColor = getTypeColor(mainType);

    return `
      <article class="pokemon-card">
        <div class="pokemon-card__header">
          <span class="pokemon-card__type" style="color: ${typeColor}">
            ${mainType ? traduzirTipo(mainType) : ''}
          </span>
          <span class="pokemon-card__number">#${formattedId}</span>
        </div>
        <div class="pokemon-card__image-wrapper">
          ${pokemon.imageUrl
            ? `<img src="${pokemon.imageUrl}" alt="${pokemon.name}" class="pokemon-card__image" />`
            : '<span>Sem imagem</span>'
          }
        </div>
        <h3 class="pokemon-card__name">${capitalizarNome(pokemon.name)}</h3>
      </article>
    `;
  });

  pokemonListElement.innerHTML = cardHtmlList.join('');
}

/* PAGINAÇÃO */

function renderPagination() {
  if (!paginationPagesElement || !previousButtonElement || !nextButtonElement) {
    return;
  }

  if (state.totalPages <= 1) {
    paginationPagesElement.innerHTML = '';
    previousButtonElement.disabled = true;
    nextButtonElement.disabled = true;
    return;
  }

  // Atualiza botões anterior/próximo
  previousButtonElement.disabled = state.currentPage === 1;
  nextButtonElement.disabled = state.currentPage === state.totalPages;

  // Renderiza números das páginas
  const pagesToShow = computePagesToShow(state.currentPage, state.totalPages);
  const pageButtons = pagesToShow.map(pageNumber => {
    const isActive = state.currentPage === pageNumber;
    return `
      <li>
        <button
          type="button"
          class="pagination__page-button ${isActive ? 'pagination__page-button--active' : ''}"
          data-page="${pageNumber}"
          ${isActive ? 'aria-current="page"' : ''}
        >
          ${pageNumber}
        </button>
      </li>
    `;
  });

  paginationPagesElement.innerHTML = pageButtons.join('');

  // Adiciona event listeners aos botões de página
  paginationPagesElement.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      const pageNumber = parseInt(button.dataset.page);
      goToPage(pageNumber);
    });
  });
}

function computePagesToShow(currentPage, totalPages) {
  const MAX_VISIBLE_PAGES = 3;
  const pages = [];

  let start = Math.max(1, currentPage - 1);
  let end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

  if (end - start + 1 < MAX_VISIBLE_PAGES) {
    start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  }

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  return pages;
}

function goToPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > state.totalPages) return;
  state.currentPage = pageNumber;

  if (state.mode === 'search' && state.searchResults.length > 0) {
    renderSearchPage();
  } else {
    state.mode = 'list';
    loadPokemonList();
  }

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* FEEDBACK VISUAL */

function setLoading(isLoading) {
  state.isLoading = isLoading;
  if (isLoading) {
    pokemonListElement.innerHTML = '<p class="loading-message">Carregando pokémons...</p>';
  }
}

function showError(message) {
  pokemonListElement.innerHTML = `<p class="error-message">${message}</p>`;
}

/* HELPERS */

function capitalizarNome(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getTypeColor(type) {
  const typeColors = {
    grass: '#10b981',
    fire: '#ef4444',
    water: '#3b82f6',
    bug: '#84cc16',
    normal: '#6b7280',
    poison: '#a855f7',
    electric: '#eab308',
    ground: '#d97706',
    fairy: '#ec4899',
    fighting: '#dc2626',
    psychic: '#ec4899',
    rock: '#78716c',
    ghost: '#7c3aed',
    ice: '#06b6d4',
    dragon: '#6366f1',
    steel: '#64748b',
    dark: '#1f2937',
    flying: '#8b5cf6'
  };

  return typeColors[type] ?? '#10b981';
}

function traduzirTipo(type) {
  const mapaTipos = {
    grass: 'Planta',
    fire: 'Fogo',
    water: 'Água',
    bug: 'Inseto',
    normal: 'Normal',
    poison: 'Veneno',
    electric: 'Elétrico',
    ground: 'Terra',
    fairy: 'Fada',
    fighting: 'Lutador',
    psychic: 'Psíquico',
    rock: 'Pedra',
    ghost: 'Fantasma',
    ice: 'Gelo',
    dragon: 'Dragão',
    steel: 'Aço',
    dark: 'Sombrio',
    flying: 'Voador'
  };

  return mapaTipos[type] ?? type;
}

function traduzirTipoParaIngles(tipoPt) {
  const mapaReverso = {
    'planta': 'grass',
    'fogo': 'fire',
    'água': 'water',
    'agua': 'water',
    'inseto': 'bug',
    'normal': 'normal',
    'veneno': 'poison',
    'elétrico': 'electric',
    'eletrico': 'electric',
    'terra': 'ground',
    'fada': 'fairy',
    'lutador': 'fighting',
    'psíquico': 'psychic',
    'psiquico': 'psychic',
    'pedra': 'rock',
    'fantasma': 'ghost',
    'gelo': 'ice',
    'dragão': 'dragon',
    'dragao': 'dragon',
    'aço': 'steel',
    'aco': 'steel',
    'sombrio': 'dark',
    'voador': 'flying'
  };

  return mapaReverso[tipoPt.toLowerCase()] || null;
}
