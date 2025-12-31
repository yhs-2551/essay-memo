import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model (POM) - Blog Editor
 *
 * UI 변경 시 이 파일만 수정하면 모든 테스트에 반영됩니다.
 * data-testid 속성을 사용하여 스타일/텍스트 변경에 영향받지 않습니다.
 */
export class BlogEditorPage {
    readonly page: Page

    // 에디터 요소들
    readonly titleInput: Locator
    readonly contentTextarea: Locator
    readonly submitButton: Locator

    // 모드 선택 카드
    readonly standardModeCard: Locator
    readonly consultationModeCard: Locator

    // 이미지 업로드
    readonly imageUploadButton: Locator
    readonly imageFileInput: Locator
    readonly imageCount: Locator

    // 토스트
    readonly draftDeleteButton: Locator
    readonly toastMessage: Locator

    constructor(page: Page) {
        this.page = page

        // data-testid 기반 셀렉터
        this.titleInput = page.getByTestId('editor-title')
        this.contentTextarea = page.getByTestId('editor-content')
        this.submitButton = page.getByTestId('editor-submit')
        this.standardModeCard = page.getByTestId('mode-standard')
        this.consultationModeCard = page.getByTestId('mode-consultation')

        // 아직 data-testid가 없는 요소들 (향후 추가 예정)
        this.imageUploadButton = page.locator('button:has-text("이미지 첨부")')
        this.imageFileInput = page.locator('input[type="file"]')
        this.imageCount = page.locator('text=/\\d+\\/20/')
        this.draftDeleteButton = page.locator('button:has-text("삭제")')
        this.toastMessage = page.locator('[data-sonner-toast]')
    }

    async goto() {
        await this.page.goto('/blog/new')
        await this.titleInput.waitFor({ timeout: 15000 })
    }

    async dismissDraftToast() {
        if (await this.draftDeleteButton.isVisible({ timeout: 1500 }).catch(() => false)) {
            await this.draftDeleteButton.click()
            await this.page.waitForTimeout(300)
        }
    }

    async fillEssay(title: string, content: string) {
        await this.titleInput.fill(title)
        await this.contentTextarea.fill(content)
    }

    async selectStandardMode() {
        await this.standardModeCard.click()
    }

    async selectConsultationMode() {
        await this.consultationModeCard.click()
    }

    async submit() {
        await this.submitButton.click()
    }

    async waitForSaveComplete() {
        await this.page.waitForURL(/\/blog\//, { timeout: 90000 })
    }

    async uploadImage(buffer: Buffer, name = 'test.png') {
        await this.imageUploadButton.click()
        await this.imageFileInput.setInputFiles({ name, mimeType: 'image/png', buffer })
    }
}
