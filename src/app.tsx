import { useEffect, useState } from 'preact/hooks'
import { AddScreen } from './screens/Add'
import { HistoryScreen } from './screens/History'
import { SummaryScreen } from './screens/Summary'
import { getCategories, getSettings, initDb, requestPersistentStorage } from './db'
import type { Category } from './types'

type Tab = 'add' | 'history' | 'summary'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('add')
  const [categories, setCategories] = useState<Category[]>([])
  const [currency, setCurrency] = useState('LKR')
  const [refreshToken, setRefreshToken] = useState(0)
  const [storagePersistent, setStoragePersistent] = useState(false)

  const loadCoreData = async (): Promise<void> => {
    const [allCategories, settings] = await Promise.all([
      getCategories(),
      getSettings(),
    ])
    setCategories(allCategories)
    setCurrency(settings.currency)
  }

  useEffect(() => {
    const boot = async (): Promise<void> => {
      await initDb()
      await loadCoreData()
      const persistent = await requestPersistentStorage()
      setStoragePersistent(persistent)
    }
    void boot()
  }, [])

  const handleDataChanged = async (): Promise<void> => {
    await loadCoreData()
    setRefreshToken((value) => value + 1)
  }

  return (
    <main class="app-shell">
      <header class="app-header">
        <h1>spendulum</h1>
        <p>quick offline expense logging</p>
        <small>{storagePersistent ? 'storage persistence requested' : 'storage persistence unavailable'}</small>
      </header>

      <section class="content">
        {activeTab === 'add' && (
          <AddScreen
            categories={categories}
            currency={currency}
            onDataChanged={() => void handleDataChanged()}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            categories={categories}
            currency={currency}
            refreshToken={refreshToken}
            onDataChanged={() => void handleDataChanged()}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryScreen
            categories={categories}
            currency={currency}
            refreshToken={refreshToken}
            onDataChanged={() => void handleDataChanged()}
          />
        )}
      </section>

      <nav class="tab-bar">
        <button
          type="button"
          class={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          add
        </button>
        <button
          type="button"
          class={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          history
        </button>
        <button
          type="button"
          class={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          summary
        </button>
      </nav>
    </main>
  )
}
