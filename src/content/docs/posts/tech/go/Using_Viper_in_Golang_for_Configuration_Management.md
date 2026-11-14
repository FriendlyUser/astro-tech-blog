---
title: Loading Go configuration from files, defaults and env vars with Viper
pubDate: "2023-05-03T14:16:45.136Z"
lastUpdated: 2026-11-14
description: "Read a YAML config file with spf13/viper, layer defaults and environment variables on top, decode it into a struct, and reload on change."
tags: ["viper", "golang", "go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3111278398.png
---

[Viper](https://github.com/spf13/viper) is the configuration library from Steve Francia (spf13), the author of Cobra and Hugo. It reads config files (JSON, TOML, YAML, HCL, INI, envfile and Java properties), and merges them with defaults, environment variables, command-line flags and explicit overrides. This post walks through the common setup: a YAML file, defaults, environment overrides, and decoding into a struct.

The examples were written against Viper v1.21.0.

## Install

Inside a Go module:

```sh
go get github.com/spf13/viper
```

## The config file

Create `config.yaml` next to your program:

```yaml
server:
  host: localhost
  port: 8080
database:
  name: appdb
  user: app
debug: false
```

## Reading it

```go
package main

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Host string `mapstructure:"host"`
		Port int    `mapstructure:"port"`
	} `mapstructure:"server"`
	Database struct {
		Name string `mapstructure:"name"`
		User string `mapstructure:"user"`
	} `mapstructure:"database"`
	Debug bool `mapstructure:"debug"`
}

func main() {
	v := viper.New()

	// Where to look for the file: config.yaml in the working directory.
	v.SetConfigName("config") // name without extension
	v.SetConfigType("yaml")
	v.AddConfigPath(".")

	// Defaults are used when no other source sets the key.
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)

	// APP_SERVER_PORT=9000 overrides server.port.
	v.SetEnvPrefix("APP")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			log.Fatalf("reading config: %v", err) // file exists but is invalid
		}
		log.Println("no config file, using defaults and environment")
	}

	// Read single values...
	fmt.Println("port:", v.GetInt("server.port"))
	fmt.Println("debug:", v.GetBool("debug"))

	// ...or decode everything into a struct.
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		log.Fatalf("decoding config: %v", err)
	}
	fmt.Printf("%+v\n", cfg)
}
```

A few things worth knowing:

- Nested keys are addressed with dots (`server.port`), and keys are case-insensitive.
- Precedence, highest first: explicit `Set` calls, flags, environment variables, the config file, key/value stores, defaults.
- `SetEnvKeyReplacer` is what turns `server.port` into `APP_SERVER_PORT`. Without it Viper would look for `APP_SERVER.PORT`, which you can't set from most shells.
- `ReadInConfig` returns `viper.ConfigFileNotFoundError` only when it searched for the file by name and found nothing. If you point at a file directly with `SetConfigFile`, a missing file comes back as an ordinary file-system error.

## Gotcha: env vars and `Unmarshal`

`AutomaticEnv` makes `Get*` calls check the environment, but `Unmarshal` only fills keys that Viper already knows about from the config file, defaults or `BindEnv`. If `debug` wasn't in the file and had no default, `APP_DEBUG=true` would show up in `v.GetBool("debug")` but not in `cfg.Debug`. Give every key a default, or bind it explicitly:

```go
if err := v.BindEnv("debug"); err != nil {
	log.Fatal(err)
}
```

## Reloading when the file changes

Viper can watch the config file using [fsnotify](https://github.com/fsnotify/fsnotify):

```go
import "github.com/fsnotify/fsnotify"

// after ReadInConfig succeeds
v.OnConfigChange(func(e fsnotify.Event) {
	log.Println("config changed:", e.Name)
})
v.WatchConfig()
```

All config paths must be set before calling `WatchConfig()`. The callback runs on Viper's watcher goroutine, so anything it updates needs to be safe for concurrent use.

## Global instance vs `viper.New()`

The Viper README shows package-level calls such as `viper.SetConfigName(...)`, which use a global instance. That works for small programs, but the docs note the global instance may be deprecated in future, and a `*viper.Viper` you create with `viper.New()` is easier to test and pass around, so the example above uses one.

## Further reading

- [Viper README](https://github.com/spf13/viper#readme)
- [API reference on pkg.go.dev](https://pkg.go.dev/github.com/spf13/viper)
