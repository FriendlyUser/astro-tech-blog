---
title: "Clearing Deactivated Phone Numbers from Twilio in Node.js using BullMQ"
pubDate: Fri, 30 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3054188082.png
tags: ["Node", "BullMQ", "Twilio"]
description: "Learn how to implement a job that clears out deactivated phone numbers from Twilio using Node.js and BullMQ."
---

In this tutorial, you'll learn how to implement a job that clears out deactivated phone numbers from Twilio using Node.js and BullMQ. You'll be using the Twilio API to fetch the list of deactivated phone numbers and the BullMQ library to process the list asynchronously. Follow the steps below to get started.

To implement a job that clears out deactivated phone numbers from Twilio in Node.js using BullMQ, you can follow the steps below:

1. Install the required dependencies: `twilio`, `bullmq`, and `axios`.
2. Create a new file, `phoneJobExecutor.ts`, and add the following code:

```typescript
import { Job } from 'bullmq';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { client } from './twilioClient';

const writeFile = promisify(fs.writeFile);

export class PhoneJobExecutor {
  private job: Job;

  /**
   * Constructor
   *
   * @constructor
   * @param job - Job
   */
  constructor(job: Job) {
    this.job = job;
  }

  /**
   * Function to process jobs
   *
   * @returns - process result
   */
  async executeJob(): Promise<void> {
    try {
      // Fetch the URL to download the txt file
      const deactivations = await client.messaging.v1.deactivations().fetch({
        date: new Date(Date.UTC(2020, 8, 5)),
      });

      // Download the txt file from the URL
      const response = await axios.get(deactivations.redirectTo, {
        responseType: 'stream',
      });

      // Save the txt file to the local file system
      const txtFilePath = path.join(__dirname, 'deactivatedPhoneNumbers.txt');
      const writer = fs.createWriteStream(txtFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Read the txt file and clear out deactivated phone numbers
      const deactivatedPhoneNumbers = (await promisify(fs.readFile)(txtFilePath))
        .toString()
        .split('\n');

      // Process the deactivated phone numbers (e.g., remove them from your database)
      for (const phoneNumber of deactivatedPhoneNumbers) {
        // Remove the deactivated phone number from your system (e.g., from your database)
        console.log(`Removed deactivated phone number: ${phoneNumber}`);
      }

      // Delete the txt file after processing
      await promisify(fs.unlink)(txtFilePath);
    } catch (error) {
      console.error('Error in phoneJobExecutor:', error);
    }
  }
}
```

3. In the same folder, create a new file named `twilioClient.ts` to initialize the Twilio client:

```typescript
import * as twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const client = twilio(accountSid, authToken);
```

This code sets up the `PhoneJobExecutor` class to download the list of deactivated phone numbers and process them (e.g., remove them from your database). You can adjust the logic inside the `for` loop to perform the desired actions with the deactivated phone numbers.

Remember to set the environment variables `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` before running your application.

4. In the same folder, create a new file named phoneJobQueue.ts to define the job queue:

```tsx
import { Queue } from 'bullmq';
import { PhoneJobExecutor } from './phoneJobExecutor';

const JOB_QUEUE_NAME = 'phoneJobQueue';

export const phoneJobQueue = new Queue(JOB_QUEUE_NAME);

phoneJobQueue.process(async (job) => {
  const phoneJobExecutor = new PhoneJobExecutor(job);
  await phoneJobExecutor.executeJob();
});
```

This code creates a new Queue instance and defines a process function that will execute the jobs in the queue. The process function creates an instance of the phoneJobExecutor class and executes the executeJob function for each job.

5. To add a job to the queue, you can use the following code:

```tsx
import { Job } from 'bullmq';
import { phoneJobQueue } from './phoneJobExecutor';

const jobData = { /* job data */ };
const jobOptions = { /* job options */ };

const job = new Job(phone_JOB_QUEUE_NAME, jobData, jobOptions);
await phoneJobQueue.add(job);
```

This code creates a new Job instance with the specified data and options, and adds it to the phoneJobQueue.

That's it! Now you can use the phoneJobQueue instance to add jobs and execute them asynchronously.

Note that you'll need to start a worker process to process the jobs in the queue. You can do this by running the following command in your terminal:

```bash
npx bullmq worker phoneJobQueue
```

This will start a worker process that will process the jobs in the phoneJobQueue queue. You can run this command in a separate terminal window to keep the worker process running in the background.

And that's how you can use BullMQ to execute jobs asynchronously in your Node.js application.