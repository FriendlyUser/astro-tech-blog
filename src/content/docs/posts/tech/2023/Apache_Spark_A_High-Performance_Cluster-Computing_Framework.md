---
description: How Apache Spark runs jobs across a cluster (driver, executors, stages, lazy evaluation), what its libraries do, and a PySpark word count you can run locally.
imgSrc: "/imgs/covers/apache-spark-a-high-performance-cluster-computing-framework.webp"
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-15T05:31:42.000Z'
lastUpdated: 2026-11-14
tags: ["python", "spark"]
title: 'Apache Spark basics: how it runs jobs, its libraries, and a PySpark example'
---

Apache Spark is an open-source engine for processing large datasets in parallel across a cluster of machines. You write transformations against a DataFrame (or the lower-level RDD API) in Python, Scala, Java, R or SQL, and Spark splits the work into tasks and runs them on many machines. It is mostly used for batch ETL, SQL analytics over data lakes, stream processing and distributed machine learning.

## The libraries

Spark ships as a core engine plus several libraries built on it:

- **Spark Core** schedules tasks, manages memory and recovers from failures. It provides the RDD API.
- **Spark SQL** runs SQL queries and powers the DataFrame and Dataset APIs. Its Catalyst optimizer rewrites queries before running them. It reads and writes Parquet, ORC, JSON, CSV, text and JDBC sources out of the box, and Avro through the separate `spark-avro` module.
- **Structured Streaming** runs streaming jobs with the same DataFrame API, treating a stream as a table that keeps growing. By default it processes data in micro-batches. The older DStream-based **Spark Streaming** API is marked legacy and gets no more updates, so use Structured Streaming for new code.
- **MLlib** provides distributed machine learning algorithms (classification, regression, clustering, collaborative filtering) and pipeline tools for feature preparation and model evaluation. It is not a wrapper around deep learning frameworks such as TensorFlow.
- **GraphX** is a graph processing API with algorithms such as PageRank and connected components. Its API is written for Scala and it has no Python API. Python users usually reach for the separate GraphFrames package.

## How Spark runs a job

A Spark application has one **driver** process and many **executor** processes. The driver runs your `main` program, turns it into a plan and schedules tasks. Executors run the tasks and hold cached data. A **cluster manager** (Spark's standalone manager, YARN or Kubernetes) starts the executors on worker machines and gives them resources. In local mode, as in the example below, everything runs in one process.

### Lazy evaluation

Transformations such as `filter`, `select` and `groupBy` don't run anything. They add steps to a plan. Work starts only when you call an **action** that needs a result, such as `count`, `show`, `collect` or writing to storage. Waiting lets Spark optimize the whole plan first, for example by pushing filters down into the file scan so less data is read.

### Stages and shuffles

When an action runs, the DAG scheduler splits the plan into **stages**. A stage boundary falls wherever data has to be redistributed between machines, which is called a **shuffle**. Grouping, joins and repartitioning need a shuffle. Narrow transformations such as `map` and `filter`, where each output partition depends on one input partition, are chained together inside a stage. Each stage runs as one task per partition. Shuffles write data to disk and send it over the network, so they are usually the most expensive part of a job.

### Fault tolerance and caching

Spark records the **lineage** of each dataset: the transformations that produced it from its source. If an executor dies and its partitions are lost, Spark recomputes just those partitions from the lineage instead of restarting the job.

You can `cache()` or `persist()` a dataset that is reused, for example in an iterative algorithm, so later actions read it from executor memory (or disk) instead of recomputing it. Spark doesn't cache anything unless you ask it to.

## Example: word count with PySpark

Spark 4.x needs Java 17 or newer, and PySpark 4.3 needs Python 3.11 or newer. Install PySpark from PyPI. The package bundles Spark itself, so you don't need a separate download for local mode:

```bash
pip install pyspark==4.3.0
```

This script counts the most common words in a text file:

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = (
    SparkSession.builder
    .appName("word-count")
    .master("local[*]")  # run locally, one worker thread per CPU core
    .getOrCreate()
)

lines = spark.read.text("README.md")  # one row per line, in a column named "value"

counts = (
    lines
    .select(F.explode(F.split(F.lower(F.col("value")), r"\W+")).alias("word"))
    .where(F.col("word") != "")
    .groupBy("word")
    .count()
    .orderBy(F.desc("count"))
)

counts.show(10)  # the action: nothing runs until here
spark.stop()
```

`groupBy` causes a shuffle, so this job runs in more than one stage. While it runs, the Spark UI at `http://localhost:4040` shows the stages and tasks.

To run the same code on a cluster, remove the `.master(...)` line and launch it with `spark-submit`, which sets the master from its command-line options.

## When Spark is the wrong tool

Spark has real overhead: starting a JVM, scheduling tasks and shuffling between machines. If your data fits on one machine, pandas, Polars or DuckDB will often finish sooner and are simpler to run. Spark pays off when the data or the computation is too big for one machine, or when you already run it on a shared cluster.

## Further reading

- [Spark documentation](https://spark.apache.org/docs/latest/)
- [Spark SQL, DataFrames and Datasets guide](https://spark.apache.org/docs/latest/sql-programming-guide.html)
- [Structured Streaming programming guide](https://spark.apache.org/docs/latest/streaming/index.html)
- [Cluster mode overview](https://spark.apache.org/docs/latest/cluster-overview.html)
