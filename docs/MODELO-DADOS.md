# Modelo editorial dos dados do Voltapp

## Campos por eletroposto

```json
{
  "id": "ID_UNICO",
  "name": "NOME PUBLICO DO LOCAL",
  "operator": "OPERADOR INFORMADO",
  "address": "ENDERECO VERIFICADO",
  "city": "Manaus",
  "state": "AM",
  "latitude": -3.1,
  "longitude": -60.0,
  "hours": "Horário por escrito e referência a feriados, se conhecidos",
  "access_rules": "Exclusivo para clientes? Precisa de cadastro? Restrições?",
  "parking": "Descrever tarifa separada, gratuidade confirmada ou 'Não confirmado'",
  "connectors": ["CCS2", "Type 2"],
  "power_kw": 50,
  "tariff": {
    "type": "kwh",
    "amount_brl": null,
    "session_fee_brl": null,
    "parking_fee_brl": null
  },
  "source_url": "https://exemplo-de-fonte-oficial.com/",
  "verified_at": "2026-10-26",
  "is_demo": false
}
```

**O JSON acima é apenas um MODELO DE CADASTRO, não um eletroposto real.** Troque todos os campos pelos dados que tenham origem comprovável. Tarifas com valor `null` nunca são publicadas como valores confirmados ou gratuitos.

## Política do MVP

- `verified_at` é data da última verificação, formato YYYY-MM-DD.
- `source_url` deve apontar para um documento/site oficial ou registro autorizado. Para dados diretamente confirmados pelo operador sem URL, a próxima versão usará evidência armazenada no backend com identificador de prova; nesta versão, é necessário ter URL HTTPS para a tarifa aparecer como confirmada.
- Com 31 dias ou mais desde a verificação, o preço aparece como **não confirmado**, ainda que exista valor no cadastro. Revalidar antes de usar em simulações de custo.
- `amount_brl: 0` só significa energia gratuitamente fornecida quando operador e condições foram verificados; **pode haver estacionamento e outras taxas**.
- Tarifa por minuto, sem curva de potência, não pode ser multiplicada por tempo fixo arbitrário para chegar a um custo dito exato.
- A potência nominal não é a potência real ao longo de toda a carga.
- Não publicar estado operacional (funcionando/fora do ar/ocupado) no banco piloto ou interface.
- Dados desconhecidos recebem rótulo explícito, jamais estimativa camuflada como preço exato.
- Informações de origem comunitária podem servir como pista para solicitar comprovação, não como prova de preço.
- Fotos, marcas e dados de redes externas exigem licença/atribuição e respeito a termos de uso.

## Modelo de produção planejado (Supabase dedicado)

Tabelas previstas: `stations`, `connectors`, `price_rules`, `price_evidence`, `access_rules`, `opening_hours`, `station_revisions`, `vehicles`, `subscriptions`, `tariff_alerts`. Geometria em PostGIS. Papéis separados: leitor autenticado, editor revisável e administrador. Toda publicação/revisão deve ser auditável, com timestamp e prova. Somente o servidor ativa assinatura via webhook validado e idempotente.

## Por que não importar 30 mil carregadores imediatamente?

A cobertura ampla sem verificação pode destruir justamente a credibilidade que queremos construir. É melhor ter um piloto geográfico honesto, limitado e denso do que um mapa nacional aparentemente completo com custos desatualizados.
