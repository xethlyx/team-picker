FROM node:14-alpine AS build
WORKDIR /usr/src/team-picker
RUN npm i -g pnpm

COPY client/package.json ./client/package.json
COPY client/package-lock.yml ./client/package-lock.yaml
COPY server/package.json ./server/package.json
COPY server/package-lock.yml ./server/package-lock.yaml

WORKDIR /usr/src/team-picker/client
RUN pnpm ci

WORKDIR /usr/src/team-picker/server
RUN pnpm ci

WORKDIR /usr/src/team-picker
COPY . .

WORKDIR /usr/src/team-picker/client
RUN pnpm build
RUN mv dist/ ../server/dist

WORKDIR /usr/src/team-picker/server
RUN pnpm build

FROM node:14-alpine as prod
WORKDIR /usr/src/team-picker

COPY --from build /usr/src/team-picker/server .

EXPOSE 3000

CMD ['npm start']
