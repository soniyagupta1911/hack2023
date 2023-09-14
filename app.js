
import * as azdev from "azure-devops-node-api";
// import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { config } from 'dotenv'
import { Configuration, OpenAIApi } from 'openai';
config()
const configuration = new Configuration({
  apiKey: "" || '', // Provide a default value to prevent 'undefined'
});
const openai = new OpenAIApi(configuration);
ViewPullRequests(9530365,"https://dev.azure.com/Universal%20Store/_git/PSX.L2O.SalesPlatformUX.MSXExperience")

const generatePrompt = (text) => {
  return `Please review and show naming convention issue: ${text}`;
};
async function getReview(text) {
  try {
    const response = await openai
  .createCompletion({
    model: 'text-davinci-003',
    prompt: generatePrompt(text),
    temperature: 0.6,
    max_tokens: 100,
  });
    if (response.status === 200) {
      console.log("success", response)
      return response;
    } 
  } catch(e) {
    console.log('An error occured while calling openai ', e)
    return null;
  }
};
// Get a GitHttpClient to talk to the Git endpoints
async function ViewPullRequests(pullRequestId, GitRepo) {
  const repoId = 'a6bad7c1-ed3d-4f3c-9b88-b3b334095513';
  let authHandler = azdev.getPersonalAccessTokenHandler('');
  console.log("got auth handler", authHandler.canHandleAuthentication())
  try {
    let connection = new azdev.WebApi("https://dev.azure.com/microsoft", authHandler);
    await connection.connect();
    const GitClient = await connection.getGitApi();
    const repositories = await GitClient.getRepository(repoId);
    
    // const pullRequests = await GitClient.getPullRequest(repoId, pullRequestId);
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
    })
    
    
    
    const combinedResponse = await Promise.all(commitChangePromises);
   // console.log(JSON.stringify(combinedResponse))
    combinedResponse.forEach(async (response) => {
     const commitData =  Object.entries(response);
     const [commitId, commitMeta] = commitData[0];
      const commitChange = commitMeta.changes;
      // get file changes
      commitChange.filter(obj=>!obj.path.includes('test')).forEach(async (changeObj) => {
        const contentChanges = await GitClient.getItem(
          repoId, changeObj.path, undefined, undefined, undefined, undefined,undefined, undefined, undefined
          ,true,true)
        // console.log(contentChanges)
        await getReview(contentChanges.content);
      }) 
    })

  } catch (e) {
    console.error('catched error from outermost try catch, ', e);
  }
  };