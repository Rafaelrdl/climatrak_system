FROM emqx/emqx:latest

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends jq \
    && rm -rf /var/lib/apt/lists/*

USER emqx
