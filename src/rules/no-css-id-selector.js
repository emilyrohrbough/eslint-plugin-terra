module.exports = {
  meta: {
    type: "suggestion", // "problem" will be.....

    docs: {
        description: "disallow the use of css id selectors in webdriver commands",
        category: "Possible Errors",
        recommended: false,
        url: "https://github.com/cerner/eslint-plugin-terra/docs/rules/no-css-id-selector"
    },

    fixable: "code",

    messages: {
      message: "Driver commands may not accept css id selectors. Expected '{{ received }}' to be {{expected}}.",
    }
  },

  create: (context) => {
    const commandsToIgnore = [
      'url',
      'execute',
      'executeAsync',
      'bind',
    ];
    
    const terraTestSelectors = [
      'selector', // Terra.should.matchScreenshot() && Terra.should.themeCombinationOfCustomProperties()
      'context',   // Terra.should.beAccessbile()
    ];

    const terraTestHelpers = [
      'beAccessible',
      'matchScreenshot',
      'themeEachCustomProperty',
      'themeCombinationOfCustomProperties'
    ];

    const createFix = (node, expected) => (
      fixer => fixer.replaceText(node, expected)
    );

    const expectedID = (received) => {
      if (!received.includes('#')) {
        return;
      }

      const selectors = received.split(' ');
      selectors.forEach((selector, index) => {
        if (selector.startsWith('#')) {
          let parsed = selector.split(':');
          parsed[0] = parsed[0].replace('#', '[id=')+']';

          selectors[index] = parsed.join(':');
        }
      });
      return `'${selectors.join(' ')}'`;
    };
    
    const validateID = (node) => {
      const received = node.value;
      if (received && typeof received == 'string' && received.includes('#')) {
        const expected = expectedID(received);
        if (expected) {
          context.report({
            node: node,
            messageId: "message",
            data: { received, expected },
            fix: createFix(node, expected)
          });
        }
      }
    }

    return {
      "MemberExpression[object.name='browser'][parent.arguments.length > 0]": function (node) {
        if (!commandsToIgnore.includes(node.property.name)) {
            node.parent.arguments.find(arg => {
              validateID(arg);
            })
        }
      },
      "MemberExpression[object.object.name='Terra']": (node) => {
        if (terraTestHelpers.includes(node.property.name)) {
          node.parent.arguments.find(arg => {
            if (node.property.name === 'themeEachCustomProperty' && arg.type === "Literal") {
              validateID(arg);
            } else if (arg.type === "ObjectExpression") {
              arg.properties.find(property => {
                if (property.key && terraTestSelectors.includes(property.key.name)) {
                  validateID(property.value);
                }
              });
            }
          });
        }
      },
    };
  }
};
