
import * as azdev from "azure-devops-node-api";
// import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { config } from 'dotenv'
config()
ViewPullRequests(9530365,"https://dev.azure.com/Universal%20Store/_git/PSX.L2O.SalesPlatformUX.MSXExperience")

// Get a GitHttpClient to talk to the Git endpoints
async function ViewPullRequests(pullRequestId, GitRepo) {
  const repoId = 'a6bad7c1-ed3d-4f3c-9b88-b3b334095513';
  let authHandler = azdev.getPersonalAccessTokenHandler(PAT_TOKEN);
  console.log("got auth handler", authHandler.canHandleAuthentication())
  try {
    let connection = new azdev.WebApi("https://dev.azure.com/microsoft", authHandler);
    await connection.connect();
    const GitClient = await connection.getGitApi();
    const repositories = await GitClient.getRepository(repoId);
    
    const pullRequests = await GitClient.getPullRequest(repoId, pullRequestId);
    const commits = await GitClient.getPullRequestCommits(repoId, pullRequestId);

    const commitIds = commits.map(commit => ({id: commit.commitId, title: commit.comment}));
    
    const commitChangePromises = commitIds.map(commit => {
      return new Promise(async (resolve, reject) => {
        try {
          const changes = await GitClient.getChanges(commit.id, repoId)
          const filteredChanges = changes.changes.filter(change => change.changeType == 1 || change.changeType == 2)
          resolve({
            [commit.id]: {
              title: commit.title,
              changes: filteredChanges.map(filteredChange => filteredChange.newContentTemplate)
            }
          });
        } catch (e) {
          reject(e)
        }
      })
    })
    
    
    
    const combinedResponse = await Promise.all(commitChangePromises);
    console.log(JSON.stringify(combinedResponse))
  } catch (e) {
    console.error('catched error from outermost try catch, ', e);
  }
  };