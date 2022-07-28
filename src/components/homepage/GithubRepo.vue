<template>
  <div class="github-project-card">
    <div>
      <div class="github-project-title">{{ project.name }}</div>
      <p>
        {{ project.description }}
      </p>
    </div>
    <div class="project-card-footer">
      <div class="project-card-footer-container">
        <div class="basic-flex">
          <StarOutline />
          <a :href="project.stargazers_url" class="github-project-plain-links">
            <span>{{ project.stargazers_count }} </span>
          </a>
          <SourceFork />
          <a :href="project.forks_url" class="github-project-plain-links">
            <!-- <v-icon>mdi-source-fork</v-icon> -->
            <!-- <comments-icon /> -->
            <span> {{ project.forks }}</span>
          </a>
        </div>
        <div>
          <File />
          <span>
            {{ project.size }} KB
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.github-project-plain-links {
  text-decoration: none;
}

.github-project-title {
  font-weight: 500;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
.github-project-card {
  /* Add shadows to create the "card" effect */
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  transition: 0.3s;
  min-width: 250px;
  width: 30%;
  height: 300px;
  margin-right: 15px;
  position: relative;
  margin-bottom: 25px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
/* On mouse-over, add a deeper shadow */
}

.github-project-card:hover {
  box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2);
}

.project-card-footer-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.basic-flex {
  display: flex;
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
import SourceFork from 'vue-material-design-icons/SourceFork.vue';
import StarOutline from 'vue-material-design-icons/StarOutline.vue';
import File from 'vue-material-design-icons/File.vue'
export default {
  props: {
    project: {
      type: Object,
      default: null,
    },
  },
  components: {
    SourceFork,
    StarOutline,
    File
  },
};
</script>