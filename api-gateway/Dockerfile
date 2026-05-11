# Stage 1

FROM cgr.dev/chainguard/node:latest-dev AS deps

USER root
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2
FROM cgr.dev/chainguard/node:latest AS runner

WORKDIR /app
USER root
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001 -G nodeuser && \
    install -d -o nodeuser -g nodeuser /app /home/nodeuser

COPY --from=deps --chown=nodeuser:nodeuser /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser src ./src
COPY --chown=nodeuser:nodeuser package.json ./

USER nodeuser

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/index.js"]