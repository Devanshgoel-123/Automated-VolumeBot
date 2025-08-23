
/**
 * Randomised interval to place maker or taker orders
 */
export const provideRandomisedInterval = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
