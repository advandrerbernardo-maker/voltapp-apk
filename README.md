# VOLTAPP ⚡ — Mapa vetorial responsivo (MVP 0.2.0)

**Repositório escolhido:** <https://github.com/advandrerbernardo-maker/voltapp-apk>

Aplicativo PWA para motoristas de veículos elétricos, orientado à transparência de **tarifas, horários e regras de acesso** dos eletropostos. O aplicativo **não afirma se algum equipamento está funcionando, ocupado ou disponível em tempo real**.

> Nome de trabalho até verificar disponibilidade da marca Voltapp no INPI. Existe um aplicativo com nome parecido no segmento em outra jurisdição. Consultar especialista antes do lançamento público e da contratação de domínio.

## Atualização 0.1.1 — mapa e Android (26/10/2026)

A versão 0.1.0 tinha um problema de estilo do Leaflet: o `integrity` do CSS remoto **não correspondia ao arquivo oficial**, então navegadores bloqueavam o CSS necessário para posicionar os blocos do mapa. O JavaScript e algumas imagens carregavam, porém apareciam peças deslocadas e vazios.

**Correções aplicadas:**
- CSS oficial Leaflet 1.9.4 incluído localmente em `vendor/leaflet.css`; licença BSD preservada em `vendor/leaflet-LICENSE.txt`.
- Contêiner do mapa reajustado quando muda tamanho, orientação do celular ou aba, sem pular de posição a cada busca.
- Remoção de filtros visuais por imagem de mapa, reduzindo trabalho de composição gráfica.
- Cabeçalho inicial mais compacto e nomes/endereços em linhas separadas nos cartões.
- Service worker versão 0.1.1 elimina cache antigo, busca HTML e CSS/JS novos primeiro na rede e não guarda tarifas reais obsoletas.
- Testes automatizados cobrem a presença do CSS Leaflet, componentes móveis e estratégia de cache.

**Para quem já instalou:** com internet ativa, reabra o app; se ainda vir a tela antiga, atualize a página no Chrome, feche e abra novamente. **Não é necessário reinstalar nem limpar todos os dados do navegador.**

## Atualização 0.2.0 — navegação fluida em celulares (26/10/2026)

**Requisito:** o mapa é o centro da experiência, com gestos suaves e organização semelhante a aplicativos cartográficos. Este MVP **não** oferece navegação curva-a-curva, trânsito em tempo real ou infraestrutura de escala/SLA do Google Maps e Waze.

- **Motor prioritário:** MapLibre GL JS 6.16.0 com renderização vetorial via WebGL no navegador e ruas OpenFreeMap (estilo Liberty).
- **Provedor:** OpenFreeMap aceita uso comercial e dispensa chave; serviço gratuito **sem SLA**. Para grande escala, considerar servidor próprio ou provedor contratado.
- **Fallback:** se GPU/WebGL2, biblioteca ou tiles vetoriais falharem, o app tenta mapa raster Leaflet. As fichas continuam acessíveis.
- **Mobile map-first:** a primeira tela mostra pesquisa, filtros e mapa grande; a lista vem abaixo com botão “Ver eletropostos”.
- **Gestos:** arrastar com um dedo, pinça para zoom, controles de zoom e centralização GPS; filtrar não recentraliza.
- **Desempenho:** canvas limitado à densidade 2x, sem filtro GPU por tile, atualização da janela e animações curtas.
- **Cache:** a versão 0.2.0 invalida o cache anterior; interface e código usam rede primeiro.

Fontes: https://maplibre.org/maplibre-gl-js/docs/ · https://openfreemap.org/ · https://openfreemap.org/tos/

### Como testar no Android

1. Abra https://advandrerbernardo-maker.github.io/voltapp-apk/ com internet e atualize a página.
2. Confirme que o mapa ocupa a área principal, logo abaixo da busca.
3. Arraste com um dedo, aplique zoom com pinça e use “Minha localização” (com autorização GPS).
4. Ative “Explorar demonstração” e toque nos marcadores fictícios para conferir a ficha.
5. Se aparecer “Modo compatibilidade”, o mapa raster Leaflet foi usado automaticamente.

Testes automáticos validam código e interface, **não medem FPS no aparelho**. A fluidez precisa de validação real no celular.

## O que funciona nesta entrega

- Tela inicial responsiva para celular e desktop, preparada para instalação PWA.
- Mapa vetorial MapLibre (WebGL) com fallback Leaflet, gestos e pesquisa de eletropostos. Inicialmente centralizado em Manaus.
- Busca por nome, endereço, bairro ou cidade; filtro de conector.
- Ficha técnica com tarifa, horário, condições de acesso, estacionamento, operador, potência, **data e fonte de verificação**.
- Regra de dados: sem fonte e verificação atual, o preço aparece como **Tarifa não confirmada**; preço zero só é classificado como gratuito se documentado.
- Simulador inicial de rota: distância rodoviária do serviço de teste OSRM, consumo configurável do carro, bateria, reserva e estimativa de energia. **Não planeja múltiplas paradas**.
- Tarifa por minuto não produz custo pontual sem curva de carga. Tarifas por kWh permitem estimar reposição de energia; custos de estacionamento desconhecidos nunca são escondidos.
- Página Clube VIP com funções planejadas, sem cobrança real.
- Modo demonstração, **desativado por padrão**, contendo três eletropostos e tarifas **FICTÍCIOS** para testar telas e cálculos, inequivocamente identificados.
- Instalação PWA em hospedagem HTTPS; service worker salva interface básica. Mapa e rotas exigem conexão à internet.

## O que ainda NÃO existe

- Banco de eletropostos reais: `data/stations.json` começa com `[]`; nenhum preço fictício entra na base pública.
- Integração Supabase, conta de usuário, painel de edição de dados, controle remoto de verificação, assinatura paga e notificações. Estes itens serão desenvolvidos após definir o processo editorial e validar as fontes.
- Motor rodoviário de produção com SLA/licença. O endpoint OSRM é usado **somente para protótipo**. O mapa prioritário usa OpenFreeMap (uso comercial permitido, mas sem SLA). O fallback Leaflet usa tiles públicas OSM, não destinadas a operação comercial em escala.
- Garantia de disponibilidade/funcionamento de carregadores.
- Publicação de APK no Play Store. O primeiro canal é PWA instalável pelo navegador.

## Publicação do Voltapp

O projeto foi preparado para o repositório oficial
`advandrerbernardo-maker/voltapp-apk`, usando a branch `main`.

O GitHub Pages está configurado para **Deploy from a branch → main → / (root)**.
O endereço é:

https://advandrerbernardo-maker.github.io/voltapp-apk/

No Chrome do Android, abra a URL e escolha **Instalar app** ou
**Adicionar à tela inicial**. O mapa depende da internet. A primeira base
pública começa vazia; para experimentar as telas, habilite o modo de
demonstração (com informações explicitamente fictícias).

## Testar localmente

É obrigatório servir os arquivos via HTTP ou HTTPS, não abrir `file://` diretamente.

```bash
cd voltapp-v01
python3 -m http.server 4173
```

Acesse `http://localhost:4173` no computador ou o endereço local do servidor a partir do celular na mesma rede. Instalação PWA e geolocalização exigem origem segura (HTTPS ou `localhost`).

### Testes de lógica

```bash
node --test tests/*.test.mjs
```

## Estrutura

```text
index.html               Interface do app
styles.css               Design responsivo e otimizações móveis
vendor/leaflet.css       CSS oficial do mapa, servido localmente
app.js                   Navegação, mapa, cards, modal e cálculo de rota
logic.mjs                Regras de tarifa, validação e autonomia
data/stations.json       Base de dados real (vazia até documentação)
data/stations.example.json  Exemplos fictícios (nunca no mapa real)
icons/                   Ícones próprios do PWA
manifest.webmanifest     Instalação Android e web
sw.js                    Cache PWA 0.2.0 com atualização de arquivos críticos
README.md                Instruções e limitações
docs/                    Produto e política de informação
tests/                   Testes automatizados
```

## Como inserir primeiro eletroposto real com responsabilidade

O cadastro é editorial nesta primeira versão: acrescente objeto ao array `data/stations.json` seguindo `docs/MODELO-DADOS.md`. Exija comprovante oficial de preço, data da confirmação, endereço, regras e horários. Regras que não foram confirmadas devem ser expressamente apresentadas como desconhecidas. Não declare o equipamento funcionando nem escreva preços só com relatos informais de usuários.

## Aviso

> Tarifas, horários e regras refletem as fontes indicadas e podem mudar sem aviso. O Voltapp não verifica funcionamento, ocupação ou disponibilidade de equipamentos. A autonomia e o custo são estimativas e não substituem a confirmação das condições no aplicativo ou estabelecimento operador.
