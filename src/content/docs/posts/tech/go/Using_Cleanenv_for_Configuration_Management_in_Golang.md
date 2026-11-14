---
title: Loading Go configuration from YAML and environment variables with cleanenv
pubDate: "2023-05-30T19:37:46.229Z"
lastUpdated: 2026-11-14
description: "How to load a Go app's config from a YAML file with environment variable overrides and defaults using cleanenv's ReadConfig and struct tags."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

[cleanenv](https://github.com/ilyakaznacheev/cleanenv) is a small Go library that fills a config struct from a file, environment variables, and defaults declared in struct tags. It reads YAML, JSON, TOML, EDN and `.env` files (picked by file extension), so you can keep sensible values in a file and override them per environment without code changes. The examples use v1.5.0, the latest release at the time of writing.

## Install

```sh
go get github.com/ilyakaznacheev/cleanenv
```

## The config struct

Tag each field with its key in the file (`yaml:"..."`) and the environment variable that can override it (`env:"..."`). `env-default` supplies a value when neither the file nor the environment has one, and `env-required` makes loading fail if the field ends up empty.

```go
package config

type AppConfig struct {
	Database struct {
		Host     string `yaml:"host" env:"DB_HOST" env-default:"localhost"`
		Port     int    `yaml:"port" env:"DB_PORT" env-default:"5432"`
		User     string `yaml:"user" env:"DB_USER"`
		Password string `yaml:"password" env:"DB_PASSWORD" env-required:"true"`
		Name     string `yaml:"name" env:"DB_NAME"`
	} `yaml:"database"`
	Server struct {
		Address string `yaml:"address" env:"SERVER_ADDRESS" env-default:"0.0.0.0"`
		Port    int    `yaml:"port" env:"SERVER_PORT" env-default:"8080"`
	} `yaml:"server"`
}
```

## Loading it

`cleanenv.ReadConfig` reads the file into the struct, then overwrites fields with any matching environment variables that are set, then fills remaining empty fields from `env-default`.

```go
package config

import "github.com/ilyakaznacheev/cleanenv"

func LoadConfig(path string) (*AppConfig, error) {
	var cfg AppConfig
	if err := cleanenv.ReadConfig(path, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
```

`ReadConfig` returns an error if the file is missing, can't be parsed, or a required field is empty.

## Using it

A `config.yaml` with no password in it:

```yaml
database:
  host: localhost
  port: 5432
  user: dbuser
  name: dbname
server:
  port: 8080
```

And `main.go` (replace `example.com/myapp` with your module path):

```go
package main

import (
	"fmt"
	"log"

	"example.com/myapp/config"
)

func main() {
	cfg, err := config.LoadConfig("config.yaml")
	if err != nil {
		log.Fatalf("cannot load config: %v", err)
	}

	fmt.Printf("database: %s@%s:%d/%s\n",
		cfg.Database.User, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	fmt.Printf("server: %s:%d\n", cfg.Server.Address, cfg.Server.Port)
}
```

Run it with the password and a port override in the environment:

```sh
DB_PASSWORD=secret SERVER_PORT=9090 go run .
```

```text
database: dbuser@localhost:5432/dbname
server: 0.0.0.0:9090
```

`SERVER_PORT` from the environment wins over `port: 8080` in the file, and `Server.Address` comes from its `env-default` because the file doesn't set it. Without `DB_PASSWORD`, `LoadConfig` returns an error instead of starting with an empty password.

## Other useful pieces

- `cleanenv.ReadEnv(&cfg)` skips the file and reads only environment variables and defaults, which suits containers configured purely through the environment.
- `env-description:"..."` documents a variable, and `cleanenv.GetDescription(&cfg, nil)` returns a list of every variable with its description, handy for a `--help` message.
- `env-prefix:"DB_"` on a nested struct field prefixes the variable names of the fields inside it.

## Gotchas

- Keep secrets out of the YAML file and the repository. Supply them through environment variables (or your platform's secret store) and mark them `env-required`.
- Don't log the whole config struct with `%+v`; it will print passwords and tokens.
- Loading a `.env` file with `ReadConfig` sets those values in the process environment, overriding variables that are already set.

## Further reading

- [cleanenv README](https://github.com/ilyakaznacheev/cleanenv)
- [Package docs on pkg.go.dev](https://pkg.go.dev/github.com/ilyakaznacheev/cleanenv)
