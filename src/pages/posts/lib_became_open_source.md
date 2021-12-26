---
title: What I did when open source library changed to semi open source
description: Here I explain what my actions when an open source library got taken down from github.
alt: my first blog post
img: /imgs/2020/08/mlfinlab_research_wayback_machine.png
tags: ["python", "mlfinlab"]
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'  


pubDate: Mon, 11 July 2020 13:00:00 GMT
---

As an programmer and an inspiring investor, I have tried to automate a lot of the web scrapping, analysis and notifications for certain stocks. One of the best open-source libraries I discovered mid 2020 was `mlfinlab`. Around August 2020, they decided to switch over to a closed source model, luckily I had opened an issue and made a fork for a small typo. 


Some of the work I have done with mlfinlab includes creating estimated returns functions to calculate profit, create portfolio strategies (buy and hold), sharpe ratio. 

![mlfinlab pr](/imgs/2020/08/mlfinlab_typo_correction.png)



For some reason mlfinlab (probably money) decided to go to a open-core model, like many other premium code offerings, this means you have to pay to get all features. In this case, this meant documentation was needed.

<v-row>
  <v-col
    sm="12"
    md="6"
  >
    <v-img contain src="/imgs/2020/08/mlfinlab_after_august2020.png" max-width="100%" max-height="800"/>
  </v-col>
  <v-col
    cols="12"
    sm="12"
    md="6"
  >
    <v-img contain src="/imgs/2020/08/mlfinlab_before_august2020.png" max-width="100%" max-height="800px" />
  </v-col>
</v-row>

Do not know if I am stupid or something, but I used to think that their pateron was had 3000 subscribers and they paid $10 each, geez open-source development really will not pay the bills. Makes me wonder how hard it is to support themselves (this is why I have ads on my site :)). From the looks of things they are only making 3000 dollars in total.

![wayback machine](/imgs/2020/08/mlfinlab_patreon.png)

Now if I made a library with 10k stars and only had $3000 dollars revenue and the pandemic hit while many investors are profitable, I would also consider using a paywall, but come on, you guys are possibly making money already. I think the reason they are asking for payment is so that you are more likely to use their services.

I already had a forked version of the main `mlfinlab` repo with all the proper docs, as a contributor I think I had the write to compile the documentation and "privately" host it (will not openly share this, although you could probably find it).

The only problem is the examples linked in the documentation (were very helpful for new investors like me) were stuck under a paywall.

So my approach to solve this problem was to use the good old internet wayback machine. My first instinct was to check the public forks as they are not deleted, but wayback machine didnt record that page. Then I checked through the pull requests, but only interns with hudson and thames were making prs.


![wayback machine](/imgs/2020/08/mlfinlab_research_wayback_machine.png)


Ultimately I found that stargazers (maybe people look at this) were tracked so I started checking all the stargazers to make sure they have repos of the old public research repo. I found a version that was a little outdated used the website to find the most active forks and merged that code into mine.

[Link Tracker](https://techgaun.github.io/active-forks/index.html)

Then, I made sure I forked all the code and kept it on my public github.


Ulimately, in this era where there are excellent open source code libraries available for free, do not trust that any company will always keep their source code public.


**Update** Someone forked my mlfinlab repo, I must have done the latest change :).