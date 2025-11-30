# Use an official Deno runtime as a parent image
FROM denoland/deno:1.44.4

# Set the working directory in the container
WORKDIR /app

# Copy the dependency manifests
COPY deno.json deno.lock ./

# Copy the source code required for caching dependencies
COPY src ./src
COPY main.ts .

# Cache the dependencies. This creates a separate layer and speeds up subsequent builds.
RUN deno cache --lock=deno.lock main.ts

# Copy the rest of the application code
COPY . .

# Specify the command to run on container startup.
# The Zypher agent requires several permissions to function correctly.
CMD ["run", "--allow-env", "--allow-run", "--allow-read", "--allow-write", "--allow-net", "--allow-sys", "main.ts"]
