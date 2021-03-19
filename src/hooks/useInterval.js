//https://overreacted.io/making-setinterval-declarative-with-react-hooks/
//https://blog.davidvassallo.me/2020/04/09/react-hooks-and-setinterval/
import { useEffect, useRef } from 'react';

export default function useInterval(callback, delay) {

    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);

}