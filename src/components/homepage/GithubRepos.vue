<template>
    <div class="github-repos-container">
        <github-repo
            v-for="project in projects"
            :project=project
            :key="project.node_id"
        />
    </div>
</template>

<style scoped>
.github-repos-container {
    display: flex;
    flex-wrap: wrap;
}
.flex-gap > div {
  margin: 12px;
}
</style>
<script>
import GithubRepo from './GithubRepo.vue'
import GithubProjects from '../../data/repos.json'
export default {
    data() {
        let projects = Object.keys(GithubProjects).map(function(k) {
            if (!isNaN(k)) {
                return GithubProjects[k]
            }
        })
        projects = projects.filter(project => project)
        return {
            projects
        }
    },
    name: 'GithubRepos',
    components: {
        GithubRepo
    }
}
</script>