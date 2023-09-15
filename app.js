
import * as azdev from "azure-devops-node-api";
// import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { config } from 'dotenv'
import { Configuration, OpenAIApi } from 'openai';
config()
const configuration = new Configuration({
  apiKey: "" || '', // Provide a default value to prevent 'undefined'
});
const openai = new OpenAIApi(configuration);
async function getLintErros(text) {
  try {
    const prompt = `Review the below typescript/react code sample for lint errors and fix as list : ${text}`
    const promptResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      temperature: 0.3,
      max_tokens: 400,
      n: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 1
    });
    if (promptResponse.status == 200) {
      return {promptType: 'namingConvention', value: promptResponse.data.choices[0].text}
    }
  } catch(e) {
    console.log('An error occured while hitting open ai endpoint for lint errors', e);
    return null;
  }
}
async function getNamingConventionErrors(text) {
  try {
    const prompt = `Review the below typescript/react code sample for naming convention errors and fix as list : ${text}`
    const promptResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      temperature: 0.3,
      max_tokens: 400,
      n: 1
    });
    if (promptResponse.status == 200) {
      return {promptType: 'lint', value: promptResponse.data.choices[0].text}
    }
  } catch(e) {
    console.log('An error occured while hitting open ai endpoint for lint errors', e);
    return null;
  }
}

async function getReview(text) {
  try {
    const promptResponses = await Promise.allSettled([getLintErros(text), getNamingConventionErrors(text)]);
    const finalResponses = promptResponses.filter(response => response.status == "fulfilled").map(response => response.value)
    return finalResponses; 
  } catch(e) {
    console.log('An error occured while calling openai settler', e)
    return null;
  }
};

function printReviews(reviews) {
  reviews.forEach((review,i) => console.log(`review_${1}`, review))
}
// Get a GitHttpClient to talk to the Git endpoints
async function ViewPullRequests(pullRequestId, GitRepo) {
  const repoId = 'a6bad7c1-ed3d-4f3c-9b88-b3b334095513';
  let authHandler = azdev.getPersonalAccessTokenHandler('');
  console.log("got auth handler", authHandler.canHandleAuthentication())
  try {
    let connection = new azdev.WebApi("https://dev.azure.com/microsoft", authHandler);
    await connection.connect();
    const GitClient = await connection.getGitApi();
    const commits = await GitClient.getPullRequestCommits(repoId, pullRequestId);
    const commitIds = commits.map(commit => ({id: commit.commitId, title: commit.comment}));
    const commitChangePromises = commitIds.map(commit => {
      return new Promise(async (resolve, reject) => {
        try {
          const changes = await GitClient.getChanges(commit.id, repoId)
          const filteredChanges = changes.changes.filter(change => (change.changeType == 1 || change.changeType == 2)&&(!change.item.isFolder))
          .map(c => ({path: c.item.path, url: c.item.url}))
          resolve({
            [commit.id]: {
              title: commit.title,
              changes: filteredChanges
            }
          });
        } catch (e) {
          reject(e)
        }
      })
    });
    const combinedResponse = await Promise.all(commitChangePromises);
   // console.log(JSON.stringify(combinedResponse))
    const reviewResponsePromises = combinedResponse.map(async (response) => {
     const commitData =  Object.entries(response);
     const [_, commitMeta] = commitData[0];
     const commitChange = commitMeta.changes;
     // get file changes
     const filteredCommits = commitChange.filter(obj=>obj.path.includes('LicensingSummary.tsx'));
     const openAiTriggers = filteredCommits.map(async (changeObj) => {
      const contentChanges = await GitClient.getItem(
        repoId, changeObj.path, undefined, undefined, undefined, undefined,undefined, undefined, undefined
        ,true,true)
      // console.log(contentChanges)
      return getReview(contentChanges.content);
    })
     const reviews = await Promise.allSettled(openAiTriggers);
     return reviews;
      // printReviews(reviews);
    });
    return Promise.allSettled(reviewResponsePromises)
  } catch (e) {
    console.error('catched error from outermost try catch, ', e);
  }
  };
const responses = await ViewPullRequests(9530365,"https://dev.azure.com/Universal%20Store/_git/PSX.L2O.SalesPlatformUX.MSXExperience")
responses.forEach((response, i) => {
  console.log(`suggestion_${i}`, response.value);
})