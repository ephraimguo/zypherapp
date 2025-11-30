## syntax=docker/dockerfile:1
#
#########################
## Stage 1: Build binary
#########################
#FROM denoland/deno:2.5.6 AS builder
#
## Work inside /app
#WORKDIR /app
#
## Copy all project files into the image
#COPY . .
#
## Compile to a self-contained executable
#RUN deno compile \
#  --allow-env \
#  --allow-net \
#  --allow-read \
#  --allow-write \
#  --allow-sys \
#  --allow-run \
#  -o /app/zypher-agent \
#  main.ts
#RUN mkdir -p /app/deno-dir /app/zypher-home /app/passwd /app/etc /app/group && \
#    chown -R deno:deno /app /app/deno-dir /app/zypher-home
#
#########################
## Stage 2: Runtime
#########################
#FROM denoland/deno:2.5.6
#
## Work inside /app
#WORKDIR /app
#
## Copy only the compiled binary from the builder stage
#COPY --from=builder /app/zypher-agent .
#
#COPY --from=builder /app/passwd /app/passwd
#COPY --from=builder /app/group /app/group
#COPY --from=builder /app/deno-dir /app/deno-dir
#COPY --from=builder /app/zypher-home /app/zypher-home
#
## Make sure the non-root user "deno" owns /app so it can write there
#USER root
#RUN chown -R deno:deno /app
#USER deno
#
## Document the port your app listens on (change if needed)
#EXPOSE 8000
#
## Run the compiled binary
#ENTRYPOINT ["./zypher-agent"]



FROM denoland/deno:2.5.6 AS builder
WORKDIR /app
COPY . .
RUN deno compile \
  --allow-env --allow-net --allow-read --allow-write \
  --allow-sys --allow-run \
  -o /app/zypher-agent \
  main.ts
RUN mkdir -p /app/deno-dir /app/zypher-home && \
    chown -R deno:deno /app /app/deno-dir /app/zypher-home

FROM denoland/deno:2.5.6
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/zypher-agent .
COPY --from=builder /app/deno-dir /app/deno-dir
COPY --from=builder /app/zypher-home /app/zypher-home
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group
ENV DENO_DIR=/app/deno-dir \
    ZYPHER_HOME=/app/zypher-home
USER root
RUN chown -R deno:deno /app
USER deno
ENTRYPOINT ["./zypher-agent"]

