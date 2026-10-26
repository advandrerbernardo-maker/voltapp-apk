# VOLTAPP ⚡ — Primeira versão funcional (MVP 0.1)

**Repositório escolhido:** <https://github.com/advandrerbernardo-maker/voltapp-apk>

Aplicativo PWA para motoristas de veículos elétricos, orientado à transparência de **tarifas, horários e regras de acesso** dos eletropostos. O aplicativo **não afirma se algum equipamento está funcionando, ocupado ou disponível em tempo real**.

> Nome de trabalho até verificar disponibilidade da marca Voltapp no INPI. Existe um aplicativo com nome parecido no segmento em outra jurisdição. Consultar especialista antes do lançamento público e da contratação de domínio.

## O que funciona nesta entrega

- Tela inicial responsiva para celular e desktop, preparada para instalação PWA.
- Mapa interativo com Leaflet e pesquisa de eletropostos. Inicialmente centralizado na região de Manaus.
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
- Motor rodoviário de produção com SLA/licença. O endpoint OSRM e as tiles do OpenStreetMap são **somente para protótipo ou testes em pequena escala**, respeitando políticas dos respectivos serviços. Não usar esse arranjo para produto comercial em escala.
- Garantia de disponibilidade/funcionamento de carregadores.
- Publicação de APK no Play Store. O primeiro canal é PWA instalável pelo navegador.

## Publicação do Voltapp

O projeto foi preparado para o repositório oficial
`advandrerbernardo-maker/voltapp-apk`, usando a branch `main`.

Para tornar o PWA acessível, ative **Settings → Pages → Deploy from a branch**,
selecione `main` e a pasta `/ (root)` e salve. A URL prevista, após a
publicação ser confirmada, é:

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
styles.css               Design responsivo
app.js                   Navegação, mapa, cards, modal e cálculo de rota
logic.mjs                Regras de tarifa, validação e autonomia
data/stations.json       Base de dados real (vazia até documentação)
data/stations.example.json  Exemplos fictícios (nunca no mapa real)
icons/                   Ícones próprios do PWA
manifest.webmanifest     Instalação Android e web
sw.js                    Cache básico da interface
README.md                Instruções e limitações
docs/                    Produto e política de informação
tests/                   Testes automatizados
```

## Como inserir primeiro eletroposto real com responsabilidade

O cadastro é editorial nesta primeira versão: acrescente objeto ao array `data/stations.json` seguindo `docs/MODELO-DADOS.md`. Exija comprovante oficial de preço, data da confirmação, endereço, regras e horários. Regras que não foram confirmadas devem ser expressamente apresentadas como desconhecidas. Não declare o equipamento funcionando nem escreva preços só com relatos informais de usuários.

## Aviso

> Tarifas, horários e regras refletem as fontes indicadas e podem mudar sem aviso. O Voltapp não verifica funcionamento, ocupação ou disponibilidade de equipamentos. A autonomia e o custo são estimativas e não substituem a confirmação das condições no aplicativo ou estabelecimento operador.
