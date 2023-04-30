---
title: Using Cleanenv for Configuration Management in Golang
pubDate: "2023-05-30T19:37:46.229Z"
description: "Cleanenv is a lightweight and easy-to-use configuration management library for Golang applications."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using Cleanenv for Configuration Management in Golang

Cleanenv is a lightweight and easy-to-use configuration management library for Golang applications. It allows developers to manage application configuration through environment variables and configuration files, making it easier to maintain different configurations for different environments. This article will discuss how to use Cleanenv in your Golang projects, covering installation, usage, and best practices.

## Installation

To install Cleanenv, use the `go get` command to fetch the latest version of the library:

```sh
go get -u github.com/ilyakaznacheev/cleanenv
```

## Configuration Struct

Before diving into Cleanenv, let's define a configuration struct for our application. This struct will hold all the necessary configuration values and will be populated by Cleanenv.

```go
package config

type AppConfig struct {
	Database struct {
		Host     string `yaml:"host" env:"DB_HOST"`
		Port     int    `yaml:"port" env:"DB_PORT"`
		User     string `yaml:"user" env:"DB_USER"`
		Password string `yaml:"password" env:"DB_PASSWORD"`
		Name     string `yaml:"name" env:"DB_NAME"`
	} `yaml:"database"`
	Server struct {
		Address string `yaml:"address" env:"SERVER_ADDRESS"`
		Port    int    `yaml:"port" env:"SERVER_PORT"`
	} `yaml:"server"`
}
```

In this example, the `AppConfig` struct holds two nested structs for database and server configurations. The struct fields are tagged with `yaml` and `env` to indicate the corresponding YAML keys and environment variable names.

## Reading Configuration

To read the configuration values from a YAML file and environment variables, we'll create a function in the `config` package called `LoadConfig`.

```go
package config

import (
	"github.com/ilyakaznacheev/cleanenv"
)

func LoadConfig(configPath string) (*AppConfig, error) {
	cfg := &AppConfig{}

	err := cleanenv.ReadConfig(configPath, cfg)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}
```

`LoadConfig` takes a `configPath` string as an argument, which is the path to the YAML configuration file. It creates a new `AppConfig` struct and uses `cleanenv.ReadConfig` to populate the struct with values from the configuration file and environment variables. If there's an error, the function returns it; otherwise, it returns the populated `AppConfig` struct.

## Usage

Now that we have our configuration management functions set up, let's see how to use them in a Golang application.

First, create a YAML configuration file called `config.yaml` with the following content:

```yaml
database:
  host: localhost
  port: 5432
  user: dbuser
  password: dbpassword
  name: dbname
server:
  address: 0.0.0.0
  port: 8080
```

Next, create a `main. file with the following code:

```go
package main

import (
	"fmt"
	"log"
	"your_project/config"
)

func main() {
	cfg, err := config.LoadConfig("config.yaml")
	if err != nil {
		log.Fatalf("Cannot load config: %v", err)
	}

	fmt.Printf("Database configuration: %+v\n", cfg.Database)
	fmt.Printf("Server configuration: %+v\n", cfg.Server)
}
```

Here, we import the `config` package and call the `LoadConfig` function, passing the path to our configuration file. If there's an error loading the configuration, we log it and exit. Otherwise, we print out the loaded configuration values.

When you run the application, it should output the following:

```
Database configuration: {Host:localhost Port:5432 User:dbuser Password:dbpassword Name:dbname}
Server configuration: {Address:0.0.0.0 Port:8080}
```

## Best Practices

- Store sensitive data such as passwords and API keys in environment variables to avoid accidentally committing them to your code repository.
- Use a separate configuration file for each environment (e.g., `config.development.yaml`, `config.production.yaml`). This makes it easier to manage different configurations for different environments.
- When deploying your application, make sure to include all necessary configuration files and environment variables.

## Conclusion

Cleanenv is a powerful and easy-to-use library for managing configuration in Golang applications. By using Cleanenv, you can keep your application's configuration organized, easy to maintain, and secure. Give it a try in your next Golang project and see how it can simplify your configuration management process.
