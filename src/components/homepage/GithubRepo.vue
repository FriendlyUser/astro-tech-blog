<template>
  <div max-width="400" height="210">
    <a :href="project.html_url">{{ project.name }}</a>
    <!-- <v-card-subtitle>{{ project.description }} </v-card-subtitle> -->
    <div class="github-project-bottom pb-2">
      <div class="float-left">
        <a :href="project.stargazers_url" class="github-project-plain-links">
          <div>mdi-star</div>
          <span>{{ project.stargazers_count }} </span>
        </a>
        <a :href="project.forks_url" class="github-project-plain-links">
          <!-- <v-icon>mdi-source-fork</v-icon> -->
          <!-- <comments-icon /> -->
          <span>{{ project.forks }}</span>
        </a>
      </div>
      <div class="float-right">
        <!-- <language-icon :iconName="project.language"/> -->
        <span> {{ project.size }} KB </span>
      </div>
    </div>
  </div>
</template>

<style>
.github-project-bottom {
  position: absolute;
  bottom: 0;
}

.github-project-plain-links {
  text-decoration: none;
}
</style>
<!-- Map Language to icon-->
<!-- Name to link -->
<!-- stargazer count -->
<!-- fork count -->
<!-- size -->
<!-- https://developerfolio.js.org/ -->
<!-- iterate across languages -->
<script>
export default {
  props: {
    project: {
      type: Object,
      default: null,
    },
  },
};
</script>