import "https://deno.land/x/dotenv/load.ts";
// import { writeFileStr, writeFileStrSync } from 'https://deno.land/std/fs/mod.ts'
const GITHUB_API_TOKEN = Deno.env.get('GITHUB_API_TOKEN');

const GITHUB_USERNAME = 'FRIENDLYUSER'
// get all repos, only public ones
const github_data1 = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, {
  headers: { 'Authorization': `token ${GITHUB_API_TOKEN}` }
})
.then(function(response: any) {
  return response
})
.then(function(response) {
  return response.json()
})
.catch(function(err) {
  console.log(err)
})
const github_data2 = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&page=2`, {
  headers: { 'Authorization': `token ${GITHUB_API_TOKEN}` }
})
.then(function(response: any) {
  return response
})
.then(function(response) {
  return response.json()
})
.catch(function(err) {
  console.log(err)
})
const github_data3 = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&page=3`, {
  headers: { 'Authorization': `token ${GITHUB_API_TOKEN}` }
})
.then(function(response: any) {
  return response
})
.then(function(response) {
  return response.json()
})
.catch(function(err) {
  console.log(err)
})

const github_data = [...github_data1, ...github_data2, ...github_data3]

const data: any = []
github_data.forEach( (project: any) => {
  if ( project.stargazers_count >= 1 ) {
    // figure out how to pull badges somehow
    // dump all data inside, subfilter later
    const { id, name, node_id, html_url, created_at, updated_at, language, forks, stargazers_count, description } = project
    data.push(project)
  }
})


// highest to lowest
function compare( a: any, b: any ) {
  if ( a.stargazers_count < b.stargazers_count ){
    return 1;
  }
  if ( a.stargazers_count > b.stargazers_count ){
    return -1;
  }
  return 0;
}

const started_array = data.sort( compare );

// sort data by stars
const skillsFile = '../src/data/repos.json'
await Deno.writeTextFile(skillsFile, JSON.stringify(started_array));