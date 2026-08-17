const mockStackScreen = jest.fn((_props: unknown) => null);

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");

  return {
    __esModule: true,
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) => children,
      { Screen: (props: unknown) => mockStackScreen(props) },
    ),
    usePathname: () => "/summon-rivalry",
    useRouter: () => ({ replace: jest.fn() }),
  };
});

jest.mock("@/shared/ui/AppErrorBoundary", () => {
  const React = jest.requireActual("react");

  return {
    __esModule: true,
    AppErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { render } from "@testing-library/react-native";

import RootLayout from "../../../app/_layout";

test.each(["summon-rivalry", "summon-rivalry/manual"])(
  "disables the native stack header for %s",
  (routeName) => {
    render(<RootLayout />);

    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: routeName,
        options: expect.objectContaining({ headerShown: false }),
      }),
    );
  },
);
