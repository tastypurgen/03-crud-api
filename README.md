# CRUD API (Fastify)

Simple Product Catalog CRUD API built with Fastify and TypeScript. The application stores products in memory and supports single-process and clustered execution modes.

## Requirements

- Node.js `24.10.0` or newer
- npm

## Installation

```bash
npm install
```

## Environment Variables

Create a local `.env` file if you want to override defaults:

```env
PORT=4000
```

A committed example is available in `.env.example`.

## Available Scripts

### Development mode

Starts the API with file watching:

```bash
npm run start:dev
```

### Production mode

Builds the project and runs the bundled server:

```bash
npm run start:prod
```

### Cluster mode

Builds the project and starts:

- a load balancer on `PORT`
- worker processes on `PORT + n`
- round-robin request distribution across workers

```bash
npm run start:multi
```

### Tests

```bash
npm test
```

## API

Base URL:

```text
http://localhost:4000/api
```

### Get all products

```http
GET /api/products
```

Returns `200 OK` with an array of products.

### Get product by id

```http
GET /api/products/{productId}
```

Returns:

- `200 OK` with the product
- `400 Bad Request` if `productId` is not a UUID
- `404 Not Found` if the product does not exist

### Create product

```http
POST /api/products
Content-Type: application/json
```

Request body:

```json
{
  "name": "Mechanical Keyboard",
  "description": "Compact wireless keyboard",
  "price": 129.99,
  "category": "electronics",
  "inStock": true
}
```

Returns:

- `201 Created` with the new product
- `400 Bad Request` if required fields are missing or `price <= 0`

### Update product

```http
PUT /api/products/{productId}
Content-Type: application/json
```

Uses the same request body as `POST /api/products`.

Returns:

- `200 OK` with the updated product
- `400 Bad Request` if `productId` is invalid or the payload is invalid
- `404 Not Found` if the product does not exist

### Delete product

```http
DELETE /api/products/{productId}
```

Returns:

- `204 No Content` when deleted
- `400 Bad Request` if `productId` is invalid
- `404 Not Found` if the product does not exist

## Product shape

```json
{
  "id": "uuid-generated-on-server",
  "name": "string",
  "description": "string",
  "price": 129.99,
  "category": "electronics",
  "inStock": true
}
```

## Example requests

Create:

```bash
curl -X POST http://localhost:4000/api/products ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Book\",\"description\":\"Hardcover novel\",\"price\":19.99,\"category\":\"books\",\"inStock\":true}"
```

Get all:

```bash
curl http://localhost:4000/api/products
```

Get one:

```bash
curl http://localhost:4000/api/products/{productId}
```

Update:

```bash
curl -X PUT http://localhost:4000/api/products/{productId} ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Book\",\"description\":\"Updated edition\",\"price\":24.99,\"category\":\"books\",\"inStock\":false}"
```

Delete:

```bash
curl -X DELETE http://localhost:4000/api/products/{productId}
```

## Error handling

- Unknown routes return `404` with a human-friendly message.
- Invalid request payloads and invalid UUIDs return `400`.
- Unexpected server-side failures return `500`.
