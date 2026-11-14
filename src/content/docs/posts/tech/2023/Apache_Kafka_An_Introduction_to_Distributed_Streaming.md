---
description: How Apache Kafka stores events in partitioned, replicated logs, how producers and consumer groups use them, and how to run a single KRaft broker locally.
imgSrc: "/imgs/covers/apache-kafka-an-introduction-to-distributed-streaming.webp"
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-04T21:22:19.000Z'
lastUpdated: 2026-11-14
tags: ["kafka"]
title: 'Apache Kafka basics: topics, partitions, producers and consumer groups'
---

Apache Kafka is an open-source event streaming platform from the Apache Software Foundation. At its core it is a distributed, append-only log. Producers append records to it, consumers read from it at their own pace, and the records stay on disk for a configured retention period whether or not anyone has read them. That last part is the main difference from a traditional message queue such as RabbitMQ, where a message is normally gone once it is acknowledged.

Because records are kept, several independent applications can read the same stream, and a consumer can rewind and reprocess old data. Typical uses are log and metrics collection, feeding data between services and databases (often with Kafka Connect), event sourcing, and stream processing with Kafka Streams or Flink.

## Topics and partitions

A **topic** is a named stream of records. Each topic is split into one or more **partitions**, and each partition is an ordered, append-only sequence of records. Every record in a partition gets a sequential **offset**.

Kafka only guarantees order within a partition, not across a whole topic. If you need all events for one customer in order, give them the same key so they land in the same partition.

Retention is set per topic. By default brokers keep data for 7 days (`log.retention.hours=168`), and you can also cap it by size. A topic with `cleanup.policy=compact` instead keeps the latest record for each key, which suits changelog-style data.

## Brokers and replication

A **broker** is a Kafka server. A cluster has several brokers, and each partition is replicated to a configurable number of them (the replication factor). One replica is the **leader** and handles reads and writes. The others are followers that copy its data. If the leader's broker fails, one of the in-sync followers becomes the new leader. Spreading partition leaders across brokers is how Kafka spreads load.

Cluster metadata used to live in Apache ZooKeeper. Kafka now manages it itself with **KRaft**, its built-in Raft-based controller quorum. ZooKeeper mode was removed in Kafka 4.0, so new clusters, and old ones upgrading to 4.x, run in KRaft mode.

## Producers

**Producers** write records to topics. The client library picks the partition:

- Records with a key go to a partition chosen by hashing the key, so the same key always lands in the same partition (as long as the partition count doesn't change).
- Records without a key are spread across partitions in batches rather than one record at a time, which gives better batching than strict round-robin.
- You can plug in a custom partitioner.

The `acks` setting controls durability. `acks=0` doesn't wait for the broker, `acks=1` waits for the leader, and `acks=all` (the default since Kafka 3.0) waits until all in-sync replicas have the record. Combine `acks=all` with the topic's `min.insync.replicas` to decide how many copies must exist before a write counts as successful.

## Consumers and consumer groups

**Consumers** read records from topics. Consumers that share a `group.id` form a **consumer group**, and Kafka assigns each partition to exactly one consumer in the group. That is how you scale reading: add consumers, up to the number of partitions. Extra consumers beyond that sit idle. A different group gets its own copy of the whole stream.

Each group commits the offset it has processed per partition. Kafka stores these commits in an internal topic, `__consumer_offsets`. When a consumer restarts, or its partitions move to another member of the group, reading resumes from the last committed offset. If you commit before processing, a crash can skip records. If you commit after, a crash can make you process some twice. Plan for at-least-once delivery unless you use Kafka's transactions.

## Try it locally

You need Java 17 or newer. Download a release from the [Kafka downloads page](https://kafka.apache.org/downloads) (4.4.0 at the time of writing), unpack it, and from that directory format storage and start a single broker that is also its own controller:

```bash
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
bin/kafka-storage.sh format --standalone -t $KAFKA_CLUSTER_ID -c config/server.properties
bin/kafka-server-start.sh config/server.properties
```

In a second terminal, create a topic and write a few records. Each line you type is one record. Press Ctrl+C to stop.

```bash
bin/kafka-topics.sh --create --topic quickstart-events --bootstrap-server localhost:9092
bin/kafka-console-producer.sh --topic quickstart-events --bootstrap-server localhost:9092
```

In a third terminal, read them back from the start of the log:

```bash
bin/kafka-console-consumer.sh --topic quickstart-events --from-beginning --bootstrap-server localhost:9092
```

Run the consumer again and you'll see the same records. Reading them didn't remove them.

## When not to use Kafka

- **Low volume and simple work queues.** Running a Kafka cluster is real operational work. If you need a few hundred jobs a minute delivered to workers, a managed queue or RabbitMQ is simpler.
- **Per-message routing and priorities.** Kafka has no per-message priority or routing rules. Consumers read partitions in order.
- **Too many partitions.** Partitions cost broker memory and file handles, and you can add partitions later but not remove them. Adding them also changes which partition a key maps to, which breaks per-key ordering for existing keys.

## Further reading

- [Kafka documentation](https://kafka.apache.org/documentation/)
- [Kafka quickstart](https://kafka.apache.org/quickstart)
