import { Tabs } from 'expo-router/js-tabs';
import { KrishnaTabBar } from '../../components/KrishnaTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <KrishnaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, animation: 'shift' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="japa" />
      <Tabs.Screen name="garden" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
