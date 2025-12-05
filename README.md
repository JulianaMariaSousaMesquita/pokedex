# 🔴 Pokedéx Interativa

Pokedéx interativa desenvolvida como parte de um desafio técnico de Front-End, baseada no layout fornecido no Figma e consumindo dados da [PokéAPI](https://pokeapi.co/).  
A aplicação foi construída em **Vanilla JavaScript**, focando em organização de código, responsividade e interatividade sem recarregar a página.

---

## 🎯 Objetivo do Projeto

O objetivo deste projeto é demonstrar:

- Consumo de API pública (PokéAPI);
- Manipulação de DOM com JavaScript puro;
- Implementação de **listagem**, **busca**, **filtros** e **paginação**;
- Criação de uma interface responsiva que segue o layout do Figma.

---

## 🚀 Funcionalidades

- ✅ **Listagem de Pokémon**  
  - Exibição de uma lista de Pokémon com informações básicas vindas da PokéAPI.

- 🔍 **Busca em tempo real**  
  - Busca por nome (e/ou outros critérios, se definidos no desafio) sem recarregar a página.
  - Atualização imediata da lista conforme o usuário digita.

- 🗂️ **Filtros**  
  - Filtros de Pokémon (por exemplo, tipo) conforme solicitado no desafio técnico.
  - Combinação de filtros com busca e paginação.

- 📄 **Paginação**  
  - Navegação entre páginas de resultados.
  - Controle do número de Pokémon exibidos por página.

- 📱 **Layout Responsivo**  
  - Interface adaptada para **mobile**, **tablet** e **desktop**, seguindo o design do Figma.

---

## 🧰 Tecnologias Utilizadas

- **HTML5**
- **CSS3** (layout responsivo baseado no Figma)
- **JavaScript (Vanilla JS)**
  - `fetch` para consumo de API
  - Manipulação de DOM
  - Controle de estado da busca, filtros e paginação

> 📝 **Justificativa do uso de Vanilla JS:**  
> O desafio solicita explicitamente o uso de JavaScript puro para avaliar domínio da linguagem sem abstrações de frameworks. Por isso, toda a lógica de interface, estado e comunicação com a API foi implementada apenas com **Vanilla JavaScript**, priorizando clareza, organização e legibilidade do código.

---

## 🏗️ Estrutura do Projeto

```bash
.
├── index.html        # Estrutura principal da página
├── /assets           # Imagens, ícones e fontes (incluindo logo da PokéAPI)
├── /styles
│   └── styles.css    # Estilos gerais e responsividade
└── /scripts
    └── index.js          # Ponto de entrada da aplicação: consome a PokéAPI,
                          # controla o estado (página, busca) e renderiza
                          # os cards e a paginação no DOM
