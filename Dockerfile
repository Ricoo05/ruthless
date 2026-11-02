FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
USER node
EXPOSE 4173
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:4173/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-static-demo.mjs"]
