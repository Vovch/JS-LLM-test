// src/test-payloads/createReactHook.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './codeToTest'; // The LLM's hook will be in 'codeToTest.ts'

describe('useToggle Hook', () => {

  it('should return the correct initial value', () => {
    const { result: resultFalse } = renderHook(() => useToggle(false));
    const { result: resultTrue } = renderHook(() => useToggle(true));

    expect(resultFalse.current[0]).toBe(false);
    expect(resultTrue.current[0]).toBe(true);
  });

  it('should return a boolean and a function', () => {
    const { result } = renderHook(() => useToggle(false));

    expect(typeof result.current[0]).toBe('boolean');
    expect(typeof result.current[1]).toBe('function');
  });

  it('should toggle the value from false to true and back to false', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(false);
  });

  it('should provide a stable toggle function reference (useCallback test)', () => {
    const { result, rerender } = renderHook(() => useToggle(false));
    const firstToggleFunction = result.current[1];

    rerender();
    const secondToggleFunction = result.current[1];

    expect(firstToggleFunction).toBe(secondToggleFunction);
  });
});