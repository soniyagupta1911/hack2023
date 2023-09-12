import React, { useState } from 'react';
import logo from './logo.svg';
import { Configuration, OpenAIApi } from 'openai';
import {WebApi, getPersonalAccessTokenHandler} from 'azure-devops-node-api';
import './App.css';
import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';

function App() {
  const [text, setText] = useState('');
  const [summarizedtext, setSummarizedText] = useState('');
  const [loading, setLoading] = useState(false);

  const configuration = new Configuration({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY || '', // Provide a default value to prevent 'undefined'
  });
  const openai = new OpenAIApi(configuration);

  function ViewPullRequests(pullRequestId: number, GitRepo: string) {
    debugger;
    let authHandler = getPersonalAccessTokenHandler("rjq3qtv6yrgf567gpg3ua6ibl4nnqrcegwm23up7tphoc7yymqzq");
    let connection = new WebApi("https://microsoft.visualstudio.com/Universal%20Store", authHandler);
  
    // Get a GitHttpClient to talk to the Git endpoints
    connection.getGitApi().then((GitClient)=>{ GitClient.getPullRequest(GitRepo, pullRequestId).then((pullRequests:GitPullRequest) => {
      GitClient.getPullRequestCommits(GitRepo, pullRequestId).then(commits => {
          commits.forEach(commit => {
              console.log(`${commit.commitId?.substring(0, 8)} ${commit.comment}`);
              GitClient.getChanges(commit.commitId!, GitRepo).then(changes => {
                  changes.changes?.forEach(change => {
                      console.log(`${change.changeType}: ${change.item?.path}`);
                  });
              });
          });
      });
}).catch(error => console.error(error));});

  const handleSumit = (e:any) => {
    ViewPullRequests(9530365,"https://microsoft.visualstudio.com/Universal%20Store/_git/PSX.L2O.SalesPlatformUX.MSXExperience")
    e.preventDefault();
    setLoading(true);

    openai
      .createCompletion({
        model: 'text-davinci-003',
        prompt: generatePrompt(text),
        temperature: 0.6,
        max_tokens: 100,
      })
      .then((res) => {
        if (res.status === 200) {
          setLoading(false);
          setSummarizedText(res.data.choices[0].text!);
        }
      })
      .catch((err) => {
        console.error(err, 'An error occurred');
        setLoading(false);
      });
  };

  const generatePrompt = (text:string) => {
    return `Summarize this in two lines: ${text}`;
  };

  return (
    <div className="App_">
      <div className="header">
        <h1 className="header_text">
          Text <span className="text_active">Summarizer</span>
        </h1>
        <h2 className="header_summary">
          Summarize your text into a shorter length.
        </h2>
      </div>
      <div className="container">
        <div className="text_form">
          <form>
            <label>Enter your text</label>
            <textarea
              rows={14}
              cols={80}
              placeholder="Put your text"
              value={text || ''} // Provide a default empty string if 'text' is undefined
              onChange={(e) => setText(e.target.value)}
            />
          </form>
        </div>
        <div>
          <button type="button" onClick={handleSumit}>
            {loading ? 'Loading...' : 'Summarize'}
          </button>
        </div>
        <div className="summarized_text">
          <label>Summarized text</label>
          <textarea
            placeholder="Summarized text"
            cols={80}
            rows={14}
            value={summarizedtext || ''} // Provide a default empty string if 'summarizedtext' is undefined
            onChange={(e) => setSummarizedText(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
}

export default App;
