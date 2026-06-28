# Wizybot Chatbot Backend

An AI customer-support chatbot API built with **NestJS** and **TypeScript**. It exposes a single endpoint that receives a natural-language message, lets an **OpenAI Chat Completion** model decide which tool to use via **function calling**, executes that tool, and returns a final natural-language answer.

The chatbot has access to two tools:

- **`searchProducts`** — searches a product catalog (`products_list.csv`) and returns the most relevant items.
- **`convertCurrencies`** — converts an amount between currencies using live rates from the **Open Exchange Rates** API.

## How it works

1. The user sends a message to `POST /chat`.
2. The backend forwards the message + the available tool definitions to the OpenAI Chat Completion API.
3. The model decides whether to call a tool (e.g. `searchProducts({ query: "phone" })`).
4. The backend executes the tool and sends the result back to the model.
5. The model produces a final natural-language answer, which is returned to the user.

The model can chain tools in a single turn — for example, _"What is the price of the watch in Euros?"_ triggers `searchProducts` first and then `convertCurrencies` on the returned USD price.

## Requirements

- Node.js 18+ (LTS recommended)
- An **OpenAI API key**
- An **Open Exchange Rates App ID** (free plan works)

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
# then edit .env with your real keys
```

## Environment variables

| Variable                       | Required | Default                             | Description                               |
| ------------------------------ | -------- | ----------------------------------- | ----------------------------------------- |
| `OPENAI_API_KEY`               | ✅       | —                                   | Your OpenAI API key.                      |
| `OPENAI_MODEL`                 | ❌       | `gpt-4o`                            | OpenAI chat model to use (e.g. `gpt-4o`). |
| `OPEN_EXCHANGE_RATES_APP_ID`   | ✅       | —                                   | Your Open Exchange Rates App ID.          |
| `OPEN_EXCHANGE_RATES_BASE_URL` | ❌       | `https://openexchangerates.org/api` | Base URL of the rates API.                |
| `PORT`                         | ❌       | `3000`                              | Port the server listens on.               |

## Running the app

```bash
# development (watch mode)
npm run start:dev
```

Once running:

- API base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`

## API

### `POST /chat`

Send a natural-language message to the chatbot.

**Request body**

| Field     | Type   | Rules                                    |
| --------- | ------ | ---------------------------------------- |
| `message` | string | Required, non-empty, max 500 characters. |

```json
{ "message": "I am looking for a phone" }
```

**Response** `200 OK`

```json
{
  "answer": "I found a couple of phones for you. The iPhone 12 is available for 900.0 USD at https://..., and the iPhone 13 is priced at 1099.0 USD at https://..."
}
```

**Error responses**

| Status                      | When                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| `400 Bad Request`           | Invalid input (empty/missing/too long message) or unsupported currency code. |
| `500 Internal Server Error` | Unexpected/external failure (e.g. provider error).                           |

## Consuming the endpoint

### cURL

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am looking for a phone"}'
```

### Postman / Insomnia

- Method: `POST`
- URL: `http://localhost:3000/chat`
- Header: `Content-Type: application/json`
- Body (raw → JSON): `{ "message": "How many Canadian Dollars are 350 Euros" }`

### Example queries

```text
I am looking for a phone
I am looking for a present for my dad
How much does a watch cost?
What is the price of the watch in Euros
How many Canadian Dollars are 350 Euros
```

## Testing

```bash
npm test          # unit tests
npm run test:e2e  # e2e tests
npm run test:cov  # coverage
```

## Tech stack

- NestJS 11 + TypeScript
- OpenAI Chat Completion API (function calling)
- Open Exchange Rates API (currency rates)
- Swagger (OpenAPI) for documentation
- Jest (unit + e2e)
- SWC as the build/dev compiler
