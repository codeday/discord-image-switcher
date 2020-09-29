FROM node:14.8 as builder
WORKDIR /app
COPY ./package.json ./yarn.lock /app/
RUN yarn install

COPY ./ /app

RUN yarn run build

FROM node:14.8-slim as runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder "/app/dist/" "/app/dist/"
COPY --from=builder "/app/node_modules/" "/app/node_modules/"
COPY --from=builder "/app/package.json" "/app/package.json"

CMD ["npm", "run", "start"]
