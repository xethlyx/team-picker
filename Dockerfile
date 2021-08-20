# PNPM SETUP
FROM node:14-alpine AS pnpm
RUN npm i -g pnpm
RUN pnpm config set store-dir /.pnpm-store

# BUILD CLIENT
FROM pnpm AS build-client
WORKDIR /usr/src/team-picker/client

COPY client/package.json ./package.json
COPY client/pnpm-lock.yaml ./pnpm-lock.yaml

ENV NODE_ENV development
RUN pnpm i

COPY ./client .
RUN pnpm build

# BUILD SERVER
FROM pnpm AS build-server
WORKDIR /usr/src/team-picker/server

COPY server/package.json ./package.json
COPY server/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm i

COPY ./server .
COPY --from=build-client /usr/src/team-picker/client/dist ./client

RUN pnpm build

ENV NODE_ENV production

# for some reason this does not work, pnpm bug?
RUN pnpm prune
RUN pnpm store prune

RUN rm -rf ./src

# PRODUCTION
FROM node:14-alpine as prod
WORKDIR /usr/src/team-picker

COPY --from=build-server /.pnpm-store /.pnpm-store
COPY --from=build-server /usr/src/team-picker/server .

EXPOSE 3000

CMD ["node", "dist/index.js"]
