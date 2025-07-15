import { Command } from 'commander'

export async function buildProgram<T extends string>(
  defaultModel: T,
  action: (model: T) => Promise<void>,
) {
  const program = new Command()

  program
    .option('-m, --model [model]', 'The model to be used', defaultModel)
    .action(async (options) => {
      await action(options.model)
    })

  program.parse()
}
