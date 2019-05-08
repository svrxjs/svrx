
import SyntaxHighlighter from 'react-syntax-highlighter';
import React from 'react';

function Code(props){

    const { language, value } = props;

    return (
      <SyntaxHighlighter language={language}>
        {value}
      </SyntaxHighlighter>
    );
}

export default Code